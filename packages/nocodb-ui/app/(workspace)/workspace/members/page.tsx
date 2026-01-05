"use client";

import { useState } from "react";
import { Plus, Search, MoreHorizontal, Mail, Shield, Trash2 } from "lucide-react";
import { Button, Input } from "@/app/components/ui";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  avatar: string;
  joinedAt: string;
}

const mockMembers: Member[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "owner",
    avatar: "A",
    joinedAt: "2024-01-01",
  },
];

const roleLabels = {
  owner: "所有者",
  admin: "管理员",
  editor: "编辑者",
  viewer: "查看者",
};

const roleColors = {
  owner: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  editor: "bg-green-100 text-green-700",
  viewer: "bg-gray-100 text-gray-700",
};

export default function MembersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = mockMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">成员管理</h1>
          <p className="text-gray-500 mt-1">管理工作空间的成员和权限</p>
        </div>
        <Button variant="primary" onClick={() => setShowInviteModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          邀请成员
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索成员..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <span className="text-sm text-gray-500">{filteredMembers.length} 位成员</span>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredMembers.map((member) => (
            <div key={member.id} className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {member.avatar}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded ${roleColors[member.role]}`}>
                  {roleLabels[member.role]}
                </span>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">邀请成员</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱地址
                </label>
                <Input type="email" placeholder="输入邮箱地址" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="viewer">查看者</option>
                  <option value="editor">编辑者</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
                取消
              </Button>
              <Button variant="primary">
                <Mail className="w-4 h-4 mr-2" />
                发送邀请
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
