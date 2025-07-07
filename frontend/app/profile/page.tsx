"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  email: string;
  name: string;
  birth?: string;
  nickname?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordChangeMsg, setPasswordChangeMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/signin");
          return;
        }

        setUser(user);

        // profiles 테이블에서 데이터 조회
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // 프로필이 없는 경우, 기본 프로필 객체 생성
            console.log("프로필이 없습니다. 기본 프로필을 생성합니다.");
            setProfile({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || '',
              birth: user.user_metadata?.birth || '',
              nickname: '',
              phone: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          } else {
            console.error("프로필 조회 오류:", error);
            setError("프로필 정보를 불러올 수 없습니다.");
          }
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error("프로필 조회 중 오류:", err);
        setError("프로필 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: profile.email,
          name: profile.name,
          birth: profile.birth,
          nickname: profile.nickname,
          phone: profile.phone,
          updated_at: new Date().toISOString()
        });

      if (error) {
        setError(error.message);
      } else {
        setSuccess("프로필이 성공적으로 업데이트되었습니다.");
        setIsEditing(false);
      }
    } catch (err) {
      setError("프로필 업데이트 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '정보 없음';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async () => {
    setPasswordChangeMsg("");
    if (!newPassword || newPassword.length < 6) {
      setPasswordChangeMsg("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordChangeMsg(error.message);
    } else {
      setPasswordChangeMsg("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      // 2초 후 자동 로그아웃 및 로그인 페이지로 이동
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/auth/signin');
      }, 2000);
    }
  };

  // 계정 삭제 핸들러
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm("정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        alert("계정이 삭제되었습니다.");
        await supabase.auth.signOut();
        window.location.href = "/";
      } else {
        const data = await res.json();
        alert(data.error || "계정 삭제에 실패했습니다.");
      }
    } catch (e) {
      alert("계정 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">프로필 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">프로필 정보를 불러올 수 없습니다.</p>
          <Button onClick={() => router.push("/auth/signin")}>
            로그인 페이지로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">마이 페이지</h1>
          <p className="text-gray-600 mt-2">내 정보를 확인하고 관리하세요</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">프로필 정보</TabsTrigger>
            <TabsTrigger value="account">계정 정보</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>프로필 정보</CardTitle>
                    <CardDescription>
                      개인 정보를 확인하고 수정할 수 있습니다
                    </CardDescription>
                  </div>
                  <Button
                    variant={isEditing ? "outline" : "default"}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? "취소" : "수정"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">이름 *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={profile.name || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                        required
                        placeholder="이름을 입력하세요"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nickname">닉네임</Label>
                      <Input
                        id="nickname"
                        name="nickname"
                        value={profile.nickname || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="닉네임을 입력하세요"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">전화번호</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={profile.phone || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="010-0000-0000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birth">생년월일</Label>
                      <Input
                        id="birth"
                        name="birth"
                        value={profile.birth || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-4">
                      <Button type="submit" disabled={saving}>
                        {saving ? "저장 중..." : "저장"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={saving}
                      >
                        취소
                      </Button>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-600 text-sm">{success}</p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>계정 정보</CardTitle>
                <CardDescription>
                  계정 관련 정보를 확인할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>이메일</Label>
                      <Input
                        value={profile.email}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>계정 ID</Label>
                      <Input
                        value={profile.id}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>가입일</Label>
                      <Input
                        value={formatDate(profile.created_at || '')}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>최종 수정일</Label>
                      <Input
                        value={formatDate(profile.updated_at || '')}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">계정 관리</h3>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start" onClick={() => setShowPasswordModal(true)}>
                        비밀번호 변경
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700" onClick={handleDeleteAccount} disabled={deleting}>
                        {deleting ? "계정 삭제 중..." : "계정 삭제"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2">비밀번호 변경</h2>
            <input
              type="password"
              className="border p-2 w-full mb-2"
              placeholder="새 비밀번호"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handlePasswordChange}>변경</Button>
              <Button variant="outline" onClick={() => setShowPasswordModal(false)}>취소</Button>
            </div>
            {passwordChangeMsg && <div className="mt-2 text-sm text-red-500">{passwordChangeMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
} 