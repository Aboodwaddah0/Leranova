const USER_ROLES = new Set(["STUDENT", "PARENT", "ADMIN", "ACADEMY", "TEACHER"]);
const USER_ROLES_TEXT = "STUDENT, PARENT, ADMIN, ACADEMY, TEACHER";
const USER_GENDERS = new Set(["FEMALE", "MALE"]);

const normalizeKey = (key) => String(key).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeRole = (value) => {
	const role = String(value || "").trim().toLowerCase();
	const roleMap = {
		student: "STUDENT",
		parent: "PARENT",
		admin: "ADMIN",
		academy: "ACADEMY",
		teacher: "TEACHER"
	};

	return roleMap[role] || null;
};

const normalizeGender = (value) => {
	const gender = String(value || "").trim().toLowerCase();
	const genderMap = {
		female: "FEMALE",
		male: "MALE",
	};

	return genderMap[gender] || null;
};

const normalizeNationalId = (value) => String(value || "").trim().replace(/[\s-]/g, "");

const normalizeDateOnly = (date) => {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const parseDob = (rawValue) => {
	if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") {
		return null;
	}

	if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
		return normalizeDateOnly(rawValue);
	}

	if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
		const excelEpoch = Date.UTC(1899, 11, 30);
		const parsedFromExcel = new Date(excelEpoch + rawValue * 24 * 60 * 60 * 1000);
		if (!Number.isNaN(parsedFromExcel.getTime())) {
			return normalizeDateOnly(parsedFromExcel);
		}
	}

	const parsed = new Date(String(rawValue));
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return normalizeDateOnly(parsed);
};

const getRowValue = (row, fieldName) => {
	const targetKey = normalizeKey(fieldName);
	const entry = Object.entries(row).find(([key]) => normalizeKey(key) === targetKey);

	return entry ? entry[1] : undefined;
};

export const validateAddUserData = (data) => {
	const errors = [];

	const name = String(data?.name ?? "").trim();
	const email = String(data?.email ?? "").trim().toLowerCase();
	const password = String(data?.password ?? "");
	const role = normalizeRole(data?.role);
	const rawAge = data?.age;
	const rawGender = data?.gender;
	const rawAddress = data?.address;

	const age = rawAge === undefined || rawAge === null || rawAge === "" ? null : Number(rawAge);
	const gender =
		rawGender === undefined || rawGender === null || rawGender === ""
			? null
			: normalizeGender(rawGender);
	const address =
		rawAddress === undefined || rawAddress === null || String(rawAddress).trim() === ""
			? null
			: String(rawAddress).trim();
	const rawOrgId = data?.orgId;
	const orgId = rawOrgId === undefined || rawOrgId === null || rawOrgId === "" ? null : Number(rawOrgId);
	const orgRole = String(data?.orgRole ?? "").trim().toUpperCase();

	const rawParentId = data?.parentId;
	const parentId = rawParentId === undefined || rawParentId === null || rawParentId === "" ? null : Number(rawParentId);
	const rawParentNationalId = data?.parentNationalId;
	const parentNationalId =
		rawParentNationalId === undefined || rawParentNationalId === null || String(rawParentNationalId).trim() === ""
			? null
			: normalizeNationalId(rawParentNationalId);
	const rawCourseId = data?.courseId;
	const courseId = rawCourseId === undefined || rawCourseId === null || rawCourseId === "" ? null : Number(rawCourseId);
	const dob = parseDob(data?.dob);

	if (!name) {
		errors.push("Name is required");
	}

	if (!email) {
		errors.push("Email is required");
	} else {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			errors.push("Email must be valid");
		}
	}

	if (!password) {
		errors.push("Password is required");
	} else if (password.length < 8) {
		errors.push("Password must be at least 8 characters");
	}

	if (!role || !USER_ROLES.has(role)) {
		errors.push(`Role is required and must be one of ${USER_ROLES_TEXT}`);
	}

	if (role === 'STUDENT' && (!orgId || !Number.isInteger(orgId) || orgId <= 0)) {
		errors.push("Could not determine organization for STUDENT — ensure you are authenticated as an organization");
	}

	if (role === "STUDENT" && orgRole === "SCHOOL") {
		if (!data?.dob || String(data.dob).trim() === "") {
			errors.push("DOB is required for STUDENT in SCHOOL organizations");
		} else if (!dob) {
			errors.push("DOB must be a valid date");
		}
	}

	if (age !== null && (!Number.isInteger(age) || age < 0)) {
		errors.push("age must be a valid non-negative integer");
	}

	if (gender !== null && (!gender || !USER_GENDERS.has(gender))) {
		errors.push("Gender must be FEMALE or MALE");
	}

	// Validate student-specific fields
	if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
		errors.push("parentId must be a valid positive integer");
	}

	if (parentNationalId !== null && parentNationalId.length < 5) {
		errors.push("parentNationalId must be a valid value");
	}

	if (courseId !== null && (!Number.isInteger(courseId) || courseId <= 0)) {
		errors.push("courseId must be a valid positive integer");
	}

	return {
		errors,
		validatedData: {
			name,
			email,
			password,
			role,
			age,
			gender,
			address,
			dob,
			orgId,
			orgRole,
			parentId,
			parentNationalId,
			courseId,
		},
	};
};

export const validateAutoGeneratedUserData = (data) => {
	const errors = [];

	const name = String(data?.name ?? "").trim();
	const role = normalizeRole(data?.role);
	const rawAge = data?.age;
	const rawGender = data?.gender;
	const rawAddress = data?.address;

	const age = rawAge === undefined || rawAge === null || rawAge === "" ? null : Number(rawAge);
	const gender =
		rawGender === undefined || rawGender === null || rawGender === ""
			? null
			: normalizeGender(rawGender);
	const address =
		rawAddress === undefined || rawAddress === null || String(rawAddress).trim() === ""
			? null
			: String(rawAddress).trim();
	const rawOrgId = data?.orgId;
	const orgId = rawOrgId === undefined || rawOrgId === null || rawOrgId === "" ? null : Number(rawOrgId);
	const orgRole = String(data?.orgRole ?? "").trim().toUpperCase();

	const rawParentId = data?.parentId;
	const parentId = rawParentId === undefined || rawParentId === null || rawParentId === "" ? null : Number(rawParentId);
	const rawParentNationalId = data?.parentNationalId;
	const parentNationalId =
		rawParentNationalId === undefined || rawParentNationalId === null || String(rawParentNationalId).trim() === ""
			? null
			: normalizeNationalId(rawParentNationalId);
	const rawCourseId = data?.courseId;
	const courseId = rawCourseId === undefined || rawCourseId === null || rawCourseId === "" ? null : Number(rawCourseId);
	const dob = parseDob(data?.dob);

	if (!name) {
		errors.push("Name is required");
	}

	if (!role || !USER_ROLES.has(role)) {
		errors.push(`Role is required and must be one of ${USER_ROLES_TEXT}`);
	}

	if (role === "STUDENT" && (!orgId || !Number.isInteger(orgId) || orgId <= 0)) {
		errors.push("Could not determine organization for STUDENT — ensure you are authenticated as an organization");
	}

	if (role === "STUDENT" && orgRole === "SCHOOL") {
		if (!data?.dob || String(data.dob).trim() === "") {
			errors.push("DOB is required for STUDENT in SCHOOL organizations");
		} else if (!dob) {
			errors.push("DOB must be a valid date");
		}
	}

	if (age !== null && (!Number.isInteger(age) || age < 0)) {
		errors.push("age must be a valid non-negative integer");
	}

	if (gender !== null && (!gender || !USER_GENDERS.has(gender))) {
		errors.push("Gender must be FEMALE or MALE");
	}

	if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
		errors.push("parentId must be a valid positive integer");
	}

	if (parentNationalId !== null && parentNationalId.length < 5) {
		errors.push("parentNationalId must be a valid value");
	}

	if (courseId !== null && (!Number.isInteger(courseId) || courseId <= 0)) {
		errors.push("courseId must be a valid positive integer");
	}

	return {
		errors,
		validatedData: {
			name,
			role,
			age,
			gender,
			address,
			dob,
			orgId,
			orgRole,
			parentId,
			parentNationalId,
			courseId,
		},
	};
};

export const validateExcelData = (data, options = {}) => {
	const organizationRole = String(options?.organizationRole || "").trim().toUpperCase();
	const isSchoolOrganization = organizationRole === "SCHOOL";
	const errors = [];
	const validatedRows = [];

	if (!Array.isArray(data) || data.length === 0) {
		return {
			errors: ["Excel file is empty"],
			validatedRows,
		};
	}

	data.forEach((row, index) => {
		const rowNumber = index + 2;

		const rawName = getRowValue(row, "Name");
		const rawRole = getRowValue(row, "Role");
		const rawAge = getRowValue(row, "age");
		const rawGender = getRowValue(row, "Gender");
		const rawAddress = getRowValue(row, "Address");
		const rawEmail = getRowValue(row, "Email");
		const rawPassword = getRowValue(row, "Password");
		const rawWork = getRowValue(row, "Work");
		const rawSpecialization = getRowValue(row, "Specialization");
		const rawBio = getRowValue(row, "Bio");
		const rawDob =
			getRowValue(row, "DOB") ??
			getRowValue(row, "DateOfBirth") ??
			getRowValue(row, "BirthDate");
		const rawParentNationalId =
			getRowValue(row, "ParentId") ??
			getRowValue(row, "Parent_id") ??
			getRowValue(row, "FatherId") ??
			getRowValue(row, "ParentNationalId") ??
			getRowValue(row, "FatherNationalId") ??
			getRowValue(row, "NationalId");

		const name = String(rawName || "").trim();
		const role = normalizeRole(rawRole);
		const gender = normalizeGender(rawGender);
		const address = String(rawAddress || "").trim();
		const ageValue = rawAge === null || rawAge === undefined || rawAge === "" ? null : Number(rawAge);
		const email =
			rawEmail === null || rawEmail === undefined || String(rawEmail).trim() === ""
				? null
				: String(rawEmail).trim().toLowerCase();
		const password =
			rawPassword === null || rawPassword === undefined || String(rawPassword) === ""
				? null
				: String(rawPassword);
		const work =
			rawWork === null || rawWork === undefined || String(rawWork).trim() === ""
				? null
				: String(rawWork).trim();
		const specialization =
			rawSpecialization === null || rawSpecialization === undefined || String(rawSpecialization).trim() === ""
				? null
				: String(rawSpecialization).trim();
		const bio =
			rawBio === null || rawBio === undefined || String(rawBio).trim() === ""
				? null
				: String(rawBio).trim();
		const dob = parseDob(rawDob);
		const parentNationalId =
			rawParentNationalId === null || rawParentNationalId === undefined || String(rawParentNationalId).trim() === ""
				? null
				: normalizeNationalId(rawParentNationalId);

		let isEmailValid = true;
		if (email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				isEmailValid = false;
				errors.push(`Row ${rowNumber}: Email must be valid`);
			}
		}

		let isPasswordValid = true;
		if (password && password.length < 8) {
			isPasswordValid = false;
			errors.push(`Row ${rowNumber}: Password must be at least 8 characters`);
		}

		if (!name) {
			errors.push(`Row ${rowNumber}: Name is required`);
		}

		if (!rawRole || !role || !USER_ROLES.has(role)) {
			errors.push(`Row ${rowNumber}: Role is required and must be one of ${USER_ROLES_TEXT}`);
		}

		if (rawAge !== null && rawAge !== undefined && rawAge !== "" && (!Number.isInteger(ageValue) || ageValue < 0)) {
			errors.push(`Row ${rowNumber}: age must be a valid non-negative integer`);
		}

		if (rawGender !== null && rawGender !== undefined && rawGender !== "" && (!gender || !USER_GENDERS.has(gender))) {
			errors.push(`Row ${rowNumber}: Gender must be FEMALE or MALE`);
		}

		if (role === "STUDENT") {
			if (rawAge === null || rawAge === undefined || rawAge === "") {
				errors.push(`Row ${rowNumber}: age is required for STUDENT rows`);
			}

			if (!rawGender || !gender || !USER_GENDERS.has(gender)) {
				errors.push(`Row ${rowNumber}: Gender is required and must be FEMALE or MALE for STUDENT rows`);
			}

			if (!address) {
				errors.push(`Row ${rowNumber}: Address is required for STUDENT rows`);
			}
		}

		if (role === "STUDENT" && isSchoolOrganization) {
			if (!rawDob || String(rawDob).trim() === "") {
				errors.push(
					`Row ${rowNumber}: Date of birth is required for students in SCHOOL import (column: DOB). | الصف ${rowNumber}: تاريخ الميلاد مطلوب لصفوف الطلاب في استيراد المدرسة (عمود DOB).`
				);
			} else if (!dob) {
				errors.push(
					`Row ${rowNumber}: DOB format is invalid. Use a real date like 2012-05-20. | الصف ${rowNumber}: صيغة تاريخ الميلاد غير صحيحة. استخدم تاريخًا صحيحًا مثل 2012-05-20.`
				);
			}

			if (rawParentNationalId !== null && rawParentNationalId !== undefined && String(rawParentNationalId).trim() !== "") {
				if (!parentNationalId || parentNationalId.length < 5) {
					errors.push(`Row ${rowNumber}: ParentNationalId must be a valid value`);
				}
			}
		}

		if (
			name &&
			role &&
			USER_ROLES.has(role) &&
			(role !== "STUDENT" || (Number.isInteger(ageValue) && ageValue >= 0)) &&
			(role !== "STUDENT" || (gender && USER_GENDERS.has(gender))) &&
			(role !== "STUDENT" || address) &&
			isEmailValid &&
			isPasswordValid
		) {
			validatedRows.push({
				name,
				role,
				age: Number.isInteger(ageValue) && ageValue >= 0 ? ageValue : null,
				gender: gender || null,
				address: address || null,
				email,
				password,
				work,
				specialization,
				bio,
				dob,
				parentNationalId,
			});
		}
	});

	return {
		errors,
		validatedRows,
	};
};

export const validateParentStudentLinkData = (data) => {
	const errors = [];

	const rawStudentIds = Array.isArray(data?.studentIds) ? data.studentIds : null;
	const studentIds = rawStudentIds
		? [...new Set(rawStudentIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
		: [];

	if (!rawStudentIds) {
		errors.push("studentIds is required and must be an array");
	}

	if (rawStudentIds && rawStudentIds.length === 0) {
		errors.push("studentIds must contain at least one student id");
	}

	if (rawStudentIds && studentIds.length !== rawStudentIds.length) {
		errors.push("studentIds must contain only positive integers");
	}

	return {
		errors,
		validatedData: {
			studentIds,
		},
	};
};
