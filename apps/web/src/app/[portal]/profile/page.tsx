'use client';

import { useEffect, useState, useRef } from 'react';
import { User, Shield, Mail, Camera, CalendarDays, Phone, Building2, Briefcase, CheckCircle2, Edit2, Save, X, Loader2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/shared/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Field, FormSection } from '@/components/ui/form';
import { FaceRegister } from '@/components/face/face-register';
import {
  getMyProfile,
  updateMyProfile,
  updateMyEmail,
  updateMyPassword,
  uploadMyAvatar,
} from '@/app/actions/profile';
import { getMyFaceDescriptor } from '@/app/actions/attendance';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    department: '',
    position: '',
  });

  async function load() {
    setLoading(true);
    const [data, faceData] = await Promise.all([
      getMyProfile(),
      getMyFaceDescriptor(),
    ]);
    setProfile(data);
    setFaceRegistered(!!faceData?.descriptor);
    if (data) {
      setForm({
        full_name: data.full_name ?? '',
        phone: data.phone ?? '',
        department: data.department ?? '',
        position: data.position ?? '',
      });
      setNewEmail(data.email ?? '');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await updateMyProfile(form);
    setSaving(false);
    if (res.ok) {
      toast.success('Profil berhasil diperbarui');
      setEditing(false);
      load();
    } else {
      toast.error(res.error);
    }
  }

  async function handleUpdateEmail() {
    if (!EMAIL_REGEX.test(newEmail)) {
      toast.error('Email tidak valid');
      return;
    }
    if (newEmail === profile?.email) return;
    setSavingEmail(true);
    const res = await updateMyEmail({ email: newEmail });
    setSavingEmail(false);
    if (res.ok) {
      toast.success('Email berhasil diperbarui');
      load();
    } else {
      toast.error(res.error);
    }
  }

  async function handleUpdatePassword() {
    if (newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('Password baru tidak boleh sama dengan yang lama');
      return;
    }
    setSavingPassword(true);
    const res = await updateMyPassword({ currentPassword, newPassword });
    setSavingPassword(false);
    if (res.ok) {
      toast.success('Password berhasil diperbarui');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      toast.error(res.error);
    }
  }

  async function handleAvatarChange(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus gambar');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran maksimal 2MB');
      return;
    }
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const res = await uploadMyAvatar(dataUrl);
      setUploadingAvatar(false);
      if (res.ok) {
        toast.success('Foto profil diperbarui');
        load();
      } else {
        toast.error(res.error);
      }
    };
    reader.onerror = () => {
      setUploadingAvatar(false);
      toast.error('Gagal membaca file');
    };
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-40 bg-muted rounded-2xl animate-pulse" />
        <div className="h-24 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!profile) return null;

  const createdAt = profile.created_at ? new Date(profile.created_at) : null;
  const joinText = createdAt
    ? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(createdAt)
    : '-';

  const infoItems = [
    { label: 'Role', value: profile.role, icon: Shield, capitalize: true },
    { label: 'Bergabung', value: joinText, icon: CalendarDays },
    { label: 'Departemen', value: profile.department ?? '-', icon: Building2 },
    { label: 'Posisi', value: profile.position ?? '-', icon: Briefcase },
    { label: 'Telepon', value: profile.phone ?? '-', icon: Phone },
  ];

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola informasi profil, akun, dan wajah Anda
            </p>
          </div>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    full_name: profile.full_name ?? '',
                    phone: profile.phone ?? '',
                    department: profile.department ?? '',
                    position: profile.position ?? '',
                  });
                }}
                disabled={saving}
                aria-label="Batal edit"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div
                className="relative animate-in zoom-in-95"
                style={{ animationFillMode: 'backwards', animationDuration: '400ms' }}
              >
                <Avatar name={profile.full_name} size="xl" src={profile.avatar_url} />
                <button
                  type="button"
                  aria-label="Ubah foto profil"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-elev-md hover:brightness-110 disabled:opacity-50"
                >
                  {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAvatarChange(file);
                    e.target.value = '';
                  }}
                />
              </div>
              <h2 className="text-xl font-bold mt-4">{profile.full_name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.role && (
                <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                  {profile.role}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Nama Lengkap" required>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </Field>
              <Field label="Telepon">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08xxx"
                />
              </Field>
              <Field label="Departemen">
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </Field>
              <Field label="Posisi / Jabatan">
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </Field>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {infoItems.map((item, i) => (
              <div
                key={item.label}
                className="animate-in fade-in-0 slide-in-from-bottom-2"
                style={{ animationFillMode: 'backwards', animationDelay: `${i * 40}ms`, animationDuration: '300ms' }}
              >
                <Card>
                  <CardContent className="py-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`font-medium text-sm ${item.capitalize ? 'capitalize' : ''}`}>{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Akun & Keamanan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormSection title="Email" description="Email juga digunakan untuk login.">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <Field label="Email baru">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@company.com"
                  />
                </Field>
                <div className="flex items-end">
                  <Button onClick={handleUpdateEmail} disabled={savingEmail} className="w-full sm:w-auto gap-2">
                    {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Email
                  </Button>
                </div>
              </div>
            </FormSection>
            <FormSection title="Password" description="Minimal 6 karakter. Masukkan password saat ini untuk konfirmasi.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Password saat ini" required>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </Field>
                <Field label="Password baru" required>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
              <div>
                <Button onClick={handleUpdatePassword} disabled={savingPassword} className="gap-2">
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Password
                </Button>
              </div>
            </FormSection>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Registrasi Wajah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              {faceRegistered ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <p className="text-sm text-foreground">Wajah sudah terdaftar</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Wajah belum terdaftar</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Daftarkan wajah untuk menggunakan fitur absensi selfie otomatis.
              Pastikan pencahayaan cukup.
            </p>
            <FaceRegister isRegistered={faceRegistered} onChange={load} />
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
