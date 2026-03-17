import AppError from '../utils/appError.js';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://rag-service:8000';
const RAG_TRIGGER_TIMEOUT_MS = Number(process.env.RAG_TRIGGER_TIMEOUT_MS || 10000);

export const triggerLessonRagProcessing = async (lesson) => {
	if (!lesson?.lessonId || !lesson?.videoUrl) {
		throw new AppError('Missing lessonId or videoUrl for RAG processing trigger', 400);
	}

	const payload = {
		lessonId: String(lesson.lessonId),
		videoUrl: lesson.videoUrl,
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
			const message = await response.text();
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
