import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/student/StudentLayout';
import {
  changeStudentPassword,
  fetchStudentCourseCatalog,
  fetchStudentProfile,
  updateStudentProfile,
} from '../../services/studentService';
import ProfileHeader from '../../components/student/profile/ProfileHeader';
import ProfileCards, {
  LogoutSection,
  OrganizationInfoCard,
  QuickStats,
} from '../../components/student/profile/ProfileCards';
import EditProfileModal from '../../components/student/profile/EditProfileModal';
import ChangePasswordModal from '../../components/student/profile/ChangePasswordModal';
import { logout } from '../../redux/slices/authSlice';

export default function StudentProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [courseCount, setCourseCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const studentMode = useMemo(() => {
    const raw = String(user?.organizationType || user?.organization?.Role || '').toUpperCase();
    return raw === 'SCHOOL' ? 'SCHOOL' : 'ACADEMY';
  }, [user]);

  const organizationName =
    user?.organization?.Name ||
    user?.organization?.name ||
    profile?.organization?.Name ||
    profile?.organization?.name ||
    'Learnova';

  const organizationType =
    user?.organizationType ||
    user?.organization?.Role ||
    profile?.organization?.Role ||
    profile?.organizationType ||
    studentMode;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [profileData, courseData] = await Promise.all([
          fetchStudentProfile(),
          fetchStudentCourseCatalog(),
        ]);

        if (cancelled) return;

        setProfile(profileData || null);
        setCourseCount(Array.isArray(courseData) ? courseData.length : 0);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSaveProfile = async (patch) => {
    if (!patch || !Object.keys(patch).length) {
      setShowEditProfile(false);
      return;
    }

    setSavingProfile(true);
    setMessage('');
    setError('');

    try {
      const updated = await updateStudentProfile(patch);
      setProfile(updated);
      setMessage('Profile updated successfully.');
      setShowEditProfile(false);
    } catch (saveError) {
      setError(saveError?.response?.data?.message || saveError?.message || 'Could not update the profile right now.');
    } finally {
      setSavingProfile(false);
    }
  };

  const onSavePassword = async ({ newPassword, confirmPassword }) => {
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return false;
    }

    setSavingPassword(true);
    setMessage('');
    setError('');

    try {
      await changeStudentPassword({
        newPassword,
      });

      setMessage('Password updated successfully.');
      return true;
    } catch (saveError) {
      setError(saveError?.response?.data?.message || saveError?.message || 'Could not update password right now.');
      return false;
    } finally {
      setSavingPassword(false);
    }
  };

  const onLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <StudentLayout title="Profile" subtitle="Manage your student account">
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={18} /> Loading profile...
        </div>
      ) : (
        <div className="space-y-5">
          {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
          {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

          <ProfileHeader profile={profile} studentMode={studentMode} />

          <QuickStats
            enrolledCoursesCount={courseCount}
            membershipStatus="Active"
            accountStatus="Verified"
          />

          <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
            <ProfileCards
              onEditProfile={() => setShowEditProfile(true)}
              onChangePassword={() => setShowChangePassword(true)}
            />

            <div className="space-y-4">
              <OrganizationInfoCard
                organizationName={organizationName}
                organizationType={String(organizationType || '').toUpperCase()}
              />

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-600">About this profile</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Your profile is synced from your Learnova account and is used across course dashboards, comments, and learning history.
                </p>
              </section>
            </div>
          </div>

          <LogoutSection onLogout={onLogout} />

          <EditProfileModal
            open={showEditProfile}
            profile={profile}
            onClose={() => setShowEditProfile(false)}
            onSave={onSaveProfile}
            saving={savingProfile}
          />

          <ChangePasswordModal
            open={showChangePassword}
            onClose={() => setShowChangePassword(false)}
            onSave={onSavePassword}
            saving={savingPassword}
          />
        </div>
      )}
    </StudentLayout>
  );
}
