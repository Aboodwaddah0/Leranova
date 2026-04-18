import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchInstructorProfile } from "../services/instructorService";
import { ORG_TYPES } from "../utils/constants";

export default function InstructorSchoolOnlyRoute() {
  const user = useSelector((state) => state.auth.user);
  const initialOrganizationType = String(
    user?.organizationType || user?.organization?.Role || user?.organization?.role || "",
  ).toUpperCase();
  const [organizationType, setOrganizationType] = useState(initialOrganizationType);
  const [resolvingType, setResolvingType] = useState(!initialOrganizationType);

  useEffect(() => {
    const fromUser = String(
      user?.organizationType || user?.organization?.Role || user?.organization?.role || "",
    ).toUpperCase();

    if (fromUser) {
      setOrganizationType(fromUser);
      setResolvingType(false);
      return;
    }

    let cancelled = false;
    setResolvingType(true);

    const loadProfileType = async () => {
      try {
        const profile = await fetchInstructorProfile();
        const fromProfile = String(
          profile?.organizationType || profile?.organization?.Role || profile?.organization?.role || "",
        ).toUpperCase();

        if (!cancelled) {
          setOrganizationType(fromProfile);
        }
      } catch (_error) {
        if (!cancelled) {
          setOrganizationType("");
        }
      } finally {
        if (!cancelled) {
          setResolvingType(false);
        }
      }
    };

    loadProfileType();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (resolvingType) {
    return null;
  }

  if (organizationType !== ORG_TYPES.SCHOOL) {
    return <Navigate to="/dashboard/instructor/overview" replace />;
  }

  return <Outlet />;
}
