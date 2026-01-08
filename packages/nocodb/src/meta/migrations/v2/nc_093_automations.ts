import type { Knex } from 'knex';
import { MetaTable } from '~/utils/globals';

const up = async (knex: Knex) => {
  // Create automations table
  await knex.schema.createTable(MetaTable.AUTOMATIONS, (table) => {
    table.string('id', 20).primary().notNullable();

    table.string('fk_workspace_id', 20);
    table.string('base_id', 20);
    table.string('fk_model_id', 20);

    table.string('title', 255).notNullable();
    table.text('description');
    table.text('trigger'); // JSON: { id, type, config, conditions }

    table.boolean('is_active').defaultTo(true);
    table.string('status', 20).defaultTo('inactive'); // active, inactive, error

    table.integer('run_count').unsigned().defaultTo(0);
    table.integer('success_count').unsigned().defaultTo(0);
    table.integer('error_count').unsigned().defaultTo(0);

    table.dateTime('last_run_at');
    table.text('last_error');

    table.string('created_by', 20);
    table.timestamps(true, true);

    table.index(['base_id', 'fk_workspace_id'], 'nc_automations_context');
    table.index('fk_model_id', 'nc_automations_model_idx');
  });

  // Create automation actions table
  await knex.schema.createTable(MetaTable.AUTOMATION_ACTIONS, (table) => {
    table.string('id', 20).primary().notNullable();

    table.string('fk_workspace_id', 20);
    table.string('base_id', 20);
    table.string('fk_automation_id', 20).notNullable();

    table.string('type', 50).notNullable();
    table.string('title', 255);
    table.integer('order').unsigned().defaultTo(0);
    table.text('config'); // JSON: action-specific configuration

    table.string('on_error', 20).defaultTo('stop'); // stop, continue, retry
    table.integer('retry_count').unsigned().defaultTo(0);

    table.string('next_action_id', 20);
    table.string('true_branch_id', 20);
    table.string('false_branch_id', 20);

    table.timestamps(true, true);

    table.index(['base_id', 'fk_workspace_id'], 'nc_automation_actions_context');
    table.index('fk_automation_id', 'nc_automation_actions_automation_idx');
  });

  // Create automation logs table
  await knex.schema.createTable(MetaTable.AUTOMATION_LOGS, (table) => {
    table.string('id', 20).primary().notNullable();

    table.string('fk_workspace_id', 20);
    table.string('base_id', 20);
    table.string('fk_automation_id', 20).notNullable();

    table.string('trigger_type', 50);
    table.text('trigger_data'); // JSON

    table.string('status', 20).defaultTo('pending'); // pending, running, success, failed, cancelled

    table.dateTime('started_at');
    table.dateTime('completed_at');
    table.integer('duration_ms').unsigned();

    table.text('error');
    table.string('triggered_by', 20);

    table.timestamps(true, true);

    table.index(['base_id', 'fk_workspace_id'], 'nc_automation_logs_context');
    table.index('fk_automation_id', 'nc_automation_logs_automation_idx');
    table.index('created_at', 'nc_automation_logs_created_idx');
  });

  // Create automation action logs table
  await knex.schema.createTable(MetaTable.AUTOMATION_ACTION_LOGS, (table) => {
    table.string('id', 20).primary().notNullable();

    table.string('fk_automation_log_id', 20).notNullable();
    table.string('fk_action_id', 20);

    table.string('action_type', 50);
    table.string('status', 20).defaultTo('pending'); // pending, running, success, failed, skipped

    table.text('input'); // JSON
    table.text('output'); // JSON
    table.text('error');

    table.dateTime('started_at');
    table.dateTime('completed_at');
    table.integer('duration_ms').unsigned();

    table.index('fk_automation_log_id', 'nc_automation_action_logs_log_idx');
  });
};

const down = async (knex: Knex) => {
  await knex.schema.dropTableIfExists(MetaTable.AUTOMATION_ACTION_LOGS);
  await knex.schema.dropTableIfExists(MetaTable.AUTOMATION_LOGS);
  await knex.schema.dropTableIfExists(MetaTable.AUTOMATION_ACTIONS);
  await knex.schema.dropTableIfExists(MetaTable.AUTOMATIONS);
};

export { up, down };
