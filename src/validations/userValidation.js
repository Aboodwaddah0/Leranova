const USER_ROLES = new Set(["STUDENT", "PARENT", "ADMIN", "ACADEMY", "TEACHER"]);
const USER_GENDERS = new Set(["FEMALE", "MALE"]);

const normalizeKey = (key) => String(key).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeRole = (value) => {
	const role = String(value || "").trim().toLowerCase();
	const roleMap = {
		student: "STUDENT",
		parent: "PARENT",
		admin: "ADMIN",
		academy: "ACADEMY",
		teacher: "TEACHER",
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
		errors.push("Role is required and must be one of STUDENT, PARENT, ADMIN, ACADEMY, TEACHER");
	}

	if (role === 'STUDENT' && (!orgId || !Number.isInteger(orgId) || orgId <= 0)) {
		errors.push("Could not determine organization for STUDENT — ensure you are authenticated as an organization");
	}

	if (age !== null && (!Number.isInteger(age) || age < 0)) {
		errors.push("age must be a valid non-negative integer");
	}

	if (gender !== null && (!gender || !USER_GENDERS.has(gender))) {
		errors.push("Gender must be FEMALE or MALE");
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
			orgId,
		},
	};
};

export const validateExcelData = (data) => {
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
		const rawOrgId = getRowValue(row, "orgId");

		const name = String(rawName || "").trim();
		const role = normalizeRole(rawRole);
		const gender = normalizeGender(rawGender);
		const address = String(rawAddress || "").trim();
		const ageValue = rawAge === null || rawAge === undefined || rawAge === "" ? null : Number(rawAge);
		const orgIdValue = rawOrgId === null || rawOrgId === undefined || rawOrgId === "" ? null : Number(rawOrgId);

		if (!name) {
			errors.push(`Row ${rowNumber}: Name is required`);
		}

		if (!rawRole || !role || !USER_ROLES.has(role)) {
			errors.push(`Row ${rowNumber}: Role is required and must be one of STUDENT, PARENT, ADMIN, ACADEMY, TEACHER`);
		}

		if (rawAge === null || rawAge === undefined || rawAge === "") {
			errors.push(`Row ${rowNumber}: age is required`);
		} else if (!Number.isInteger(ageValue) || ageValue < 0) {
			errors.push(`Row ${rowNumber}: age must be a valid non-negative integer`);
		}

		if (!rawGender || !gender || !USER_GENDERS.has(gender)) {
			errors.push(`Row ${rowNumber}: Gender is required and must be FEMALE or MALE`);
		}

		if (!address) {
			errors.push(`Row ${rowNumber}: Address is required`);
		}

		if (role === 'STUDENT' && (orgIdValue === null || !Number.isInteger(orgIdValue) || orgIdValue <= 0)) {
			errors.push(`Row ${rowNumber}: orgId is required and must be a valid positive integer for STUDENT role`);
		}

		const studentOrgIdValid = role !== 'STUDENT' || (Number.isInteger(orgIdValue) && orgIdValue > 0);

		if (
			name &&
			role &&
			USER_ROLES.has(role) &&
			Number.isInteger(ageValue) &&
			ageValue >= 0 &&
			gender &&
			USER_GENDERS.has(gender) &&
			address &&
			studentOrgIdValid
		) {
			validatedRows.push({
				name,
				role,
				age: ageValue,
				gender,
				address,
				orgId: orgIdValue,
			});
		}
	});

	return {
		errors,
		validatedRows,
	};
};
