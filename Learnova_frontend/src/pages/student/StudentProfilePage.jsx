import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/student/StudentLayout';
import EducationLoading from '../../components/ui/EducationLoading';
import {
  changeStudentPassword,
  fetchStudentCourseCatalog,
  fetchStudentProfile,
  updateStudentProfile,
} from '../../services/studentService';
import ProfileHeader from '../../components/student/profile/ProfileHeader';
import ProfileCards, {
  AboutProfileCard,
  LogoutSection,
  OrganizationInfoCard,
  QuickStats,
} from '../../components/student/profile/ProfileCards';
import EditProfileModal from '../../components/student/profile/EditProfileModal';
import ChangePasswordModal from '../../components/student/profile/ChangePasswordModal';
import { logout } from '../../redux/slices/authSlice';
import { useLanguage } from '../../utils/i18n';
import { notifyProfileSaved, notifyPasswordChanged, notifyError } from '../../lib/notify';
import { sound } from '../../utils/soundHelper';

export default function StudentProfilePage() {
  const { isArabic } = useLanguage();
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
    (isArabic ? 'ليرنوفا' : 'Learnova');

  const organizationType =
    user?.organizationType ||
    user?.organization?.Role ||
    profile?.organization?.Role ||
    profile?.organizationType ||
    studentMode;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

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
          setError(loadError?.message || (isArabic ? 'فشل تحميل الملف الشخصي.' : 'Failed to load profile.'));
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

    try {
      const updated = await updateStudentProfile(patch);
      setProfile(updated);
      notifyProfileSaved(isArabic ? 'تم تحديث الملف الشخصي!' : 'Profile updated!');
      setShowEditProfile(false);
    } catch (saveError) {
      sound.dismiss();
      notifyError(saveError?.response?.data?.message || saveError?.message || (isArabic ? 'تعذر تحديث الملف الشخصي الآن.' : 'Could not update the profile right now.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const onSavePassword = async ({ newPassword, confirmPassword }) => {
    if (newPassword !== confirmPassword) {
      sound.dismiss();
      notifyError(isArabic ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' : 'New password and confirmation do not match.');
      return false;
    }

    setSavingPassword(true);

    try {
      await changeStudentPassword({ newPassword });
      notifyPasswordChanged(isArabic ? 'تم تحديث كلمة المرور!' : 'Password updated!');
      return true;
    } catch (saveError) {
      sound.dismiss();
      notifyError(saveError?.response?.data?.message || saveError?.message || (isArabic ? 'تعذر تحديث كلمة المرور الآن.' : 'Could not update password right now.'));
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
    <StudentLayout>
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? 'جاري تحميل الملف الشخصي' : 'Loading profile'}
          subtitle={isArabic ? 'نجهز بيانات حسابك التعليمية' : 'Preparing your educational account details'}
          fullscreen
        />
      ) : (
        <div className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
          ) : null}

          {/* Hero — includes back button */}
          <ProfileHeader profile={profile} studentMode={studentMode} />

          {/* Quick stats — 3 equal columns */}
          <QuickStats
            enrolledCoursesCount={courseCount}
            membershipStatus={isArabic ? 'نشط' : 'Active'}
            accountStatus={isArabic ? 'موثق' : 'Verified'}
          />

          {/* Actions — Personal Info + Change Password */}
          <ProfileCards
            onEditProfile={() => setShowEditProfile(true)}
            onChangePassword={() => setShowChangePassword(true)}
          />

          {/* Organization info */}
          <OrganizationInfoCard
            organizationName={organizationName}
            organizationType={String(organizationType || '').toUpperCase()}
          />

          {/* About profile */}
          <AboutProfileCard />

          {/* Logout */}
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
