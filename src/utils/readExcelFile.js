import XLSX from "xlsx";

export const readExcelFile = (input) => {
	let workbook;

	if (Buffer.isBuffer(input)) {
		workbook = XLSX.read(input, { type: "buffer" });
	} else if (typeof input === "string") {
		workbook = XLSX.readFile(input);
	} else {
		throw new Error("Invalid Excel input. Expected a Buffer or file path string");
	}

	const sheet = workbook.Sheets[workbook.SheetNames[0]];

	return XLSX.utils.sheet_to_json(sheet, { defval: null });
};

export default readExcelFile;