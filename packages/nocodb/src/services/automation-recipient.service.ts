import { Injectable, Logger } from '@nestjs/common';
import type { NcContext } from '~/interface/config';
import { BaseUser, User, Model, Column } from '~/models';
import NcConnectionMgrv2 from '~/utils/common/NcConnectionMgrv2';
import { Source } from '~/models';

/**
 * 自动化接收人服务
 * 提供用户列表获取功能:
 * - 系统用户（工作区成员）
 * - 表格用户字段
 * - 邮箱字段
 */

export interface SystemUserInfo {
  id: string;
  email: string;
  display_name?: string;
  avatar?: string;
  roles?: string;
}

export interface TableUserField {
  fieldId: string;
  fieldTitle: string;
  tableId: string;
  tableName: string;
  fieldType: 'user' | 'email' | 'collaborator';
  isMultiple?: boolean;
}

export interface RecipientSource {
  systemUsers: SystemUserInfo[];
  tableUserFields: TableUserField[];
}

@Injectable()
export class AutomationRecipientService {
  private readonly logger = new Logger(AutomationRecipientService.name);

  /**
   * 获取工作区/Base 的所有用户
   */
  async getSystemUsers(context: NcContext, baseId: string): Promise<SystemUserInfo[]> {
    try {
      // 获取 Base 的所有用户
      const baseUsers = await BaseUser.getUsersList(context, { base_id: baseId });
      
      const users: SystemUserInfo[] = [];
      
      for (const baseUser of baseUsers) {
        // 获取用户详细信息
        const user = await User.get(baseUser.fk_user_id);
        if (user) {
          users.push({
            id: user.id,
            email: user.email,
            display_name: user.display_name || undefined,
            avatar: user.avatar || undefined,
            roles: baseUser.roles || undefined,
          });
        }
      }

      return users;
    } catch (error) {
      this.logger.error(`Failed to get system users: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 获取表格中的用户/邮箱字段
   */
  async getTableUserFields(
    context: NcContext,
    tableId: string,
  ): Promise<TableUserField[]> {
    try {
      const model = await Model.get(context, tableId);
      if (!model) return [];

      const columns = await model.getColumns(context);
      const userFields: TableUserField[] = [];

      for (const column of columns) {
        // 用户字段类型
        if (column.uidt === 'User' || column.uidt === 'Collaborator') {
          userFields.push({
            fieldId: column.id,
            fieldTitle: column.title,
            tableId: model.id,
            tableName: model.title,
            fieldType: column.uidt === 'Collaborator' ? 'collaborator' : 'user',
            isMultiple: column.meta?.is_multi || false,
          });
        }
        // 邮箱字段类型
        else if (column.uidt === 'Email') {
          userFields.push({
            fieldId: column.id,
            fieldTitle: column.title,
            tableId: model.id,
            tableName: model.title,
            fieldType: 'email',
            isMultiple: false,
          });
        }
      }

      return userFields;
    } catch (error) {
      this.logger.error(`Failed to get table user fields: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 获取所有可用的接收人来源
   */
  async getRecipientSources(
    context: NcContext,
    baseId: string,
    tableId?: string,
  ): Promise<RecipientSource> {
    const [systemUsers, tableUserFields] = await Promise.all([
      this.getSystemUsers(context, baseId),
      tableId ? this.getTableUserFields(context, tableId) : Promise.resolve([]),
    ]);

    return {
      systemUsers,
      tableUserFields,
    };
  }

  /**
   * 根据用户 ID 获取邮箱
   */
  async getUserEmailById(userId: string): Promise<string | null> {
    try {
      const user = await User.get(userId);
      return user?.email || null;
    } catch (error) {
      this.logger.warn(`Failed to get user email for ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * 从记录数据中解析用户字段的邮箱
   */
  async resolveFieldEmails(
    context: NcContext,
    fieldId: string,
    recordData: Record<string, any>,
    tableId: string,
  ): Promise<string | string[] | null> {
    try {
      const model = await Model.get(context, tableId);
      if (!model) return null;

      const columns = await model.getColumns(context);
      const column = columns.find((c: any) => c.id === fieldId);
      if (!column) return null;

      // 通过列标题查找记录数据中的值
      const fieldValue = recordData[column.title] || recordData[column.column_name];
      if (!fieldValue) return null;

      // 用户字段
      if (column.uidt === 'User' || column.uidt === 'Collaborator') {
        // 用户字段值可能是对象或数组
        if (Array.isArray(fieldValue)) {
          const emails: string[] = [];
          for (const user of fieldValue) {
            if (typeof user === 'object' && user.email) {
              emails.push(user.email);
            } else if (typeof user === 'string') {
              // 可能是用户 ID
              const email = await this.getUserEmailById(user);
              if (email) emails.push(email);
            }
          }
          return emails;
        } else if (typeof fieldValue === 'object' && fieldValue.email) {
          return fieldValue.email;
        } else if (typeof fieldValue === 'string') {
          const email = await this.getUserEmailById(fieldValue);
          return email;
        }
      }
      // 邮箱字段
      else if (column.uidt === 'Email') {
        return typeof fieldValue === 'string' ? fieldValue : null;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to resolve field emails: ${error.message}`);
      return null;
    }
  }

  /**
   * 批量解析接收人
   * 支持多种格式:
   * - 直接邮箱: user@example.com
   * - 系统用户: {{user:user_id}}
   * - 表格字段: {{field:field_id}}
   * - 变量: {{variable.path}}
   */
  async resolveRecipients(
    context: NcContext,
    recipients: string[],
    options: {
      tableId: string;
      recordData: Record<string, any>;
      variableContext?: Record<string, any>;
    },
  ): Promise<string[]> {
    const { tableId, recordData, variableContext = {} } = options;
    const resolvedEmails: string[] = [];

    for (const recipient of recipients) {
      // 系统用户
      const userMatch = recipient.match(/^\{\{user:(.+)\}\}$/);
      if (userMatch) {
        const email = await this.getUserEmailById(userMatch[1]);
        if (email) resolvedEmails.push(email);
        continue;
      }

      // 表格字段
      const fieldMatch = recipient.match(/^\{\{field:(.+)\}\}$/);
      if (fieldMatch) {
        const result = await this.resolveFieldEmails(
          context,
          fieldMatch[1],
          recordData,
          tableId,
        );
        if (result) {
          if (Array.isArray(result)) {
            resolvedEmails.push(...result);
          } else {
            resolvedEmails.push(result);
          }
        }
        continue;
      }

      // 触发用户
      if (recipient === '{{trigger.user.email}}') {
        const email = this.getNestedValue(variableContext, 'trigger.user.email');
        if (email && typeof email === 'string') {
          resolvedEmails.push(email);
        }
        continue;
      }

      // 其他变量
      const varMatch = recipient.match(/^\{\{(.+)\}\}$/);
      if (varMatch) {
        const value = this.getNestedValue(variableContext, varMatch[1]);
        if (value) {
          if (Array.isArray(value)) {
            for (const item of value) {
              const email = this.extractEmail(item);
              if (email) resolvedEmails.push(email);
            }
          } else {
            const email = this.extractEmail(value);
            if (email) resolvedEmails.push(email);
          }
        }
        continue;
      }

      // 直接邮箱
      if (this.isValidEmail(recipient)) {
        resolvedEmails.push(recipient);
      }
    }

    // 去重
    return [...new Set(resolvedEmails)];
  }

  /**
   * 从值中提取邮箱
   */
  private extractEmail(value: any): string | null {
    if (typeof value === 'string' && this.isValidEmail(value)) {
      return value;
    }
    if (typeof value === 'object' && value?.email && this.isValidEmail(value.email)) {
      return value.email;
    }
    return null;
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * 获取嵌套对象值
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    
    return current;
  }

  /**
   * 从表格数据中获取用户列表
   * 用于"表格中的数据"来源选项
   */
  async getUsersFromTableData(
    context: NcContext,
    tableId: string,
    fieldId: string,
    filters?: Record<string, any>,
  ): Promise<SystemUserInfo[]> {
    try {
      const model = await Model.get(context, tableId);
      if (!model) return [];

      const columns = await model.getColumns(context);
      const column = columns.find((c: any) => c.id === fieldId);
      if (!column) return [];

      // 只支持用户和邮箱字段
      if (!['User', 'Collaborator', 'Email'].includes(column.uidt)) {
        return [];
      }

      const source = await Source.get(context, model.source_id);
      const baseModel = await Model.getBaseModelSQL(context, {
        id: model.id,
        dbDriver: await NcConnectionMgrv2.get(source),
        source,
      });

      // 获取记录
      const records = await baseModel.list({
        limit: 1000, // 限制最大记录数
      });

      const users: SystemUserInfo[] = [];
      const seenEmails = new Set<string>();

      for (const record of records) {
        const value = record[column.title] || record[column.column_name];
        if (!value) continue;

        if (column.uidt === 'Email') {
          if (typeof value === 'string' && this.isValidEmail(value) && !seenEmails.has(value)) {
            seenEmails.add(value);
            users.push({
              id: `email-${value}`,
              email: value,
            });
          }
        } else {
          // 用户字段
          const userValues = Array.isArray(value) ? value : [value];
          for (const userValue of userValues) {
            if (typeof userValue === 'object' && userValue.email && !seenEmails.has(userValue.email)) {
              seenEmails.add(userValue.email);
              users.push({
                id: userValue.id || `user-${userValue.email}`,
                email: userValue.email,
                display_name: userValue.display_name || userValue.name,
                avatar: userValue.avatar,
              });
            }
          }
        }
      }

      return users;
    } catch (error) {
      this.logger.error(`Failed to get users from table data: ${error.message}`, error.stack);
      return [];
    }
  }
}
