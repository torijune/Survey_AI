"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>({ name: "", nickname: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/signin");
        return;
      }
      setUser(user);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    if (!user) {
      setError("로그인 정보가 없습니다.");
      setLoading(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        name: profile.name,
        nickname: profile.nickname,
        phone: profile.phone,
      });
    setLoading(false);
    if (error) setError(error.message);
    else setSuccess(true);
  };

  if (loading) return <div className="p-8">로딩 중...</div>;

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">추가 정보 입력</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="이름"
          value={profile.name || ""}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          name="nickname"
          placeholder="닉네임"
          value={profile.nickname || ""}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="전화번호"
          value={profile.phone || ""}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "저장 중..." : "회원가입 완료"}
        </button>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">회원가입이 완료되었습니다!</div>}
      </form>
    </div>
  );
} 