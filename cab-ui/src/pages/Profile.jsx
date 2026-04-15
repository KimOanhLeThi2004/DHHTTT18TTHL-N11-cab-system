import { useEffect, useState } from "react";
import { getMe, updateMe } from "../api/api";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getMe();
        setForm({
          name: data.name || "",
          phone: data.phone || "",
        });
      } catch {
        alert("Bạn chưa đăng nhập");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateMe(form);
      alert("✅ Cập nhật thành công");
    } catch {
      alert("❌ Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow rounded p-6">
      <h1 className="text-xl font-bold mb-4">👤 Thông tin tài khoản</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Tên hiển thị</label>
          <input
            className="border p-2 rounded w-full"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Số điện thoại</label>
          <input
            className="border p-2 rounded w-full"
            value={form.phone}
            onChange={(e) =>
              setForm((f) => ({ ...f, phone: e.target.value }))
            }
          />
        </div>

        <button
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
