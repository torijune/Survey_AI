"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) setError(error.message);
      setUsers(data || []);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  if (loading) return <div className="p-8">로딩 중...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">전체 사용자 관리</h1>
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">ID</th>
            <th className="border p-2">이메일</th>
            <th className="border p-2">이름</th>
            <th className="border p-2">닉네임</th>
            <th className="border p-2">전화번호</th>
            <th className="border p-2">가입일</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border p-2">{user.id}</td>
              <td className="border p-2">{user.email}</td>
              <td className="border p-2">{user.name}</td>
              <td className="border p-2">{user.nickname}</td>
              <td className="border p-2">{user.phone}</td>
              <td className="border p-2">{user.created_at ? new Date(user.created_at).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 