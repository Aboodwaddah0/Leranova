import AppError from '../utils/appError.js';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://rag-service:8000';
const RAG_TRIGGER_TIMEOUT_MS = Number(process.env.RAG_TRIGGER_TIMEOUT_MS || 10000);

const parseRagErrorResponse = async (response) => {
	const text = await response.text().catch(() => '');
	return text || response.statusText;
};

export const verifyQdrantLessonChunks = async (lessonId) => {
	try {
		const response = await fetch(`${RAG_SERVICE_URL}/qdrant/chunks/count?lesson_id=${encodeURIComponent(String(lessonId))}`);
		if (!response.ok) {
			return null;
		}

		const body = await response.json().catch(() => null);
		const count = Number(body?.count ?? 0);
		return Number.isFinite(count) ? count : 0;
	} catch (_error) {
		return null;
	}
};

export const triggerLessonRagIngestion = async ({
	fileUrl,
	fileType,
	organizationId,
	courseId,
	subjectId,
	lessonId,
}) => {
	if (!fileUrl || !fileType || !courseId || !subjectId || !lessonId) {
		throw new AppError('Missing required ingestion fields', 400);
	}

	const payload = {
		file_url: String(fileUrl),
		file_type: String(fileType).toLowerCase(),
		course_id: Number(courseId),
		subject_id: Number(subjectId),
		lesson_id: Number(lessonId),
		organization_id: organizationId ? Number(organizationId) : null,
	};

	console.info(`[RAG] fileType=${payload.file_type}`, {
		lessonId: payload.lesson_id,
		subjectId: payload.subject_id,
		courseId: payload.course_id,
	});

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), RAG_TRIGGER_TIMEOUT_MS);

	try {
		const response = await fetch(`${RAG_SERVICE_URL}/ingest`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		if (!response.ok) {
			const message = await parseRagErrorResponse(response);
			throw new AppError(`Ingestion trigger failed: ${message}`, 502);
		}

		console.info('[RAG SUCCESS] ingestion accepted', {
			lessonId: payload.lesson_id,
			subjectId: payload.subject_id,
			courseId: payload.course_id,
			fileType: payload.file_type,
		});

		return {
			accepted: true,
			payload,
		};
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new AppError('Ingestion trigger timed out', 504);
		}

		if (error instanceof AppError) {
			throw error;
		}

		throw new AppError(`Ingestion trigger unreachable: ${error.message}`, 502);
	} finally {
		clearTimeout(timeout);
	}
};

export const triggerLessonRagProcessing = async (lesson) => {
	const fileUrl = lesson?.fileUrl ?? lesson?.videoUrl;
	const fileType = lesson?.fileType ?? 'video';

	if (!lesson?.lessonId || !fileUrl) {
		throw new AppError('Missing lessonId or fileUrl for RAG processing trigger', 400);
	}

	const payload = {
		lessonId: String(lesson.lessonId),
		fileUrl,
		fileType,
		sourceName: lesson?.sourceName ?? null,
		videoUrl: lesson?.videoUrl ?? (fileType === 'video' ? fileUrl : undefined),
		organizationId: String(lesson.organizationId),
	};

	console.log(`\n🚀 [RAG] Sending request to ${RAG_SERVICE_URL}/process-lesson`);
	console.log(`   Payload:\n${JSON.stringify(payload, null, 2)}`);

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), RAG_TRIGGER_TIMEOUT_MS);
	const start = Date.now();

	try {
		const response = await fetch(`${RAG_SERVICE_URL}/process-lesson`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		const duration = Date.now() - start;

		if (!response.ok) {
			const message = await parseRagErrorResponse(response);
			console.error(`\n❌ [RAG ERROR] Non-OK response for lesson ${lesson.lessonId}`);
			console.error(`   • status  : ${response.status} ${response.statusText}`);
			console.error(`   • body    : ${message || '(empty)'}`);
			console.error(`   • took    : ${duration}ms`);
			throw new AppError(
				`Failed to trigger RAG processing for lesson ${lesson.lessonId}: ${message || response.statusText}`,
				502
			);
		}

		const responseBody = await response.json().catch(() => null);

		console.log(`\n✅ [RAG SUCCESS] Processing triggered for lesson ${lesson.lessonId}`);
		console.log(`   • lessonId : ${lesson.lessonId}`);
		console.log(`   • status   : ${responseBody?.status ?? response.status}`);
		console.log(`   • took     : ${duration}ms`);

		if (responseBody) {
			console.log(`\n📦 [RAG RESPONSE]:\n${JSON.stringify(responseBody, null, 2)}`);
		}

		return true;
	} catch (error) {
		const duration = Date.now() - start;

		if (error.name === 'AbortError') {
			console.error(`\n❌ [RAG ERROR] Request timed out for lesson ${lesson.lessonId}`);
			console.error(`   • took : ${duration}ms (limit: ${RAG_TRIGGER_TIMEOUT_MS}ms)`);
			throw new AppError(
				`RAG trigger request timed out for lesson ${lesson.lessonId}`,
				504
			);
		}

		if (error instanceof AppError) {
			throw error;
		}

		console.error(`\n❌ [RAG ERROR] Service unreachable for lesson ${lesson.lessonId}`);
		console.error(`   • error : ${error.message}`);
		console.error(`   • took  : ${duration}ms`);
		throw new AppError(
			`RAG service is unreachable for lesson ${lesson.lessonId}`,
			502
		);
	} finally {
		clearTimeout(timeout);
	}
};

export const triggerLessonRagDirectFileProcessing = async ({
	lessonId,
	organizationId,
	fileType,
	sourceName,
	fileBuffer,
	mimeType,
}) => {
	if (!lessonId || !organizationId || !fileType || !fileBuffer) {
		throw new AppError('Missing direct file RAG processing input', 400);
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), RAG_TRIGGER_TIMEOUT_MS);
	const start = Date.now();

	const formData = new FormData();
	const blob = new Blob([fileBuffer], {
		type: mimeType || 'application/octet-stream',
	});

	formData.append('file', blob, sourceName || `${lessonId}.${fileType}`);
	formData.append('lessonId', String(lessonId));
	formData.append('organizationId', String(organizationId));
	formData.append('fileType', String(fileType));
	if (sourceName) {
		formData.append('sourceName', sourceName);
	}

	console.log(`\n🚀 [RAG] Sending direct file to ${RAG_SERVICE_URL}/process-file`);
	console.log(`   lessonId=${lessonId} fileType=${fileType} sourceName=${sourceName || '(none)'}`);

	try {
		const response = await fetch(`${RAG_SERVICE_URL}/process-file`, {
			method: 'POST',
			body: formData,
			signal: controller.signal,
		});

		const duration = Date.now() - start;

		if (!response.ok) {
			const message = await parseRagErrorResponse(response);
			console.error(`\n❌ [RAG ERROR] Direct file response failed for lesson ${lessonId}`);
			console.error(`   • status  : ${response.status} ${response.statusText}`);
			console.error(`   • body    : ${message}`);
			console.error(`   • took    : ${duration}ms`);
			throw new AppError(
				`Failed direct file RAG processing trigger for lesson ${lessonId}: ${message}`,
				502
			);
		}

		console.log(`\n✅ [RAG SUCCESS] Direct file processing triggered for lesson ${lessonId}`);
		console.log(`   • took: ${duration}ms`);
		return true;
	} catch (error) {
		const duration = Date.now() - start;

		if (error.name === 'AbortError') {
			throw new AppError(`Direct file RAG request timed out for lesson ${lessonId}`, 504);
		}

		if (error instanceof AppError) {
			throw error;
		}

		console.error(`\n❌ [RAG ERROR] Direct file service unreachable for lesson ${lessonId}`);
		console.error(`   • error : ${error.message}`);
		console.error(`   • took  : ${duration}ms`);
		throw new AppError(`RAG direct file service unreachable for lesson ${lessonId}`, 502);
	} finally {
		clearTimeout(timeout);
	}
};
