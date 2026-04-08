import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const collectionPath = path.join(__dirname, 'Learnova_Backend.postman_collection.json');
const environmentPath = path.join(__dirname, 'Learnova_Local.postman_environment.json');
const routesDir = path.join(rootDir, 'src', 'routes');
const appPath = path.join(rootDir, 'src', 'app.js');
const controllersDir = path.join(rootDir, 'src', 'controllers');

const folderMapping = {
  'authRoutes.js': { folder: 'Auth', fallbackBasePath: '/api/auth', envVar: 'organization_id' },
  'organizationRoutes.js': {
    folder: 'Organizations',
    fallbackBasePath: '/api/organizations',
    envVar: 'organization_id',
  },
  'userRoutes.js': { folder: 'Users', fallbackBasePath: '/api/users', envVar: 'user_id' },
  'courseRoutes.js': { folder: 'Courses', fallbackBasePath: '/api/courses', envVar: 'course_id' },
  'subjectRoutes.js': { folder: 'Subjects', fallbackBasePath: '/api/subjects', envVar: 'subject_id' },
  'lessonRoutes.js': { folder: 'Lessons', fallbackBasePath: '/api/lessons', envVar: 'lesson_id' },
  'chatRoutes.js': { folder: 'Chat', fallbackBasePath: '/api/chat', envVar: 'chat_id' },
  'marksRoutes.js': { folder: 'Marks', fallbackBasePath: '/api/marks', envVar: 'mark_id' },
};

const requestExamples = {
  'authRoutes.js:POST:/organization/register': {
    body: {
      Name: 'Test Academy',
      Email: 'academy@test.com',
      password: 'Test@12345',
      Role: 'Academy',
      Phone: '+970599999999',
      Address: 'Gaza',
      Description: 'Academy registration example',
    },
  },
  'authRoutes.js:POST:/organization/login': {
    body: {
      Email: 'academy@test.com',
      password: 'Test@12345',
    },
  },
  'authRoutes.js:POST:/user/login': {
    body: {
      email: 'admin@example.com',
      password: 'YourPassword',
    },
  },
  'organizationRoutes.js:POST:/': {
    body: {
      Name: 'New Academy',
      Email: 'newacademy@test.com',
      password: 'Test@12345',
      Role: 'ACADEMY',
      status: 'PENDING',
    },
  },
  'organizationRoutes.js:PATCH:/:id': {
    body: {
      Name: 'Updated Academy Name',
      status: 'APPROVED',
    },
  },
  'userRoutes.js:POST:/generate-users': {
    formdata: [
      {
        key: 'file',
        type: 'file',
        src: '',
      },
    ],
  },
  'userRoutes.js:POST:/': {
    body: {
      name: 'Test Student',
      email: 'student@test.com',
      password: 'Password123',
      role: 'STUDENT',
      age: 16,
      gender: 'MALE',
      address: 'Gaza',
    },
  },
  'userRoutes.js:PUT:/:id': {
    body: {
      name: 'Test Student Updated',
    },
  },
  'courseRoutes.js:POST:/': {
    body: {
      Name: 'Grade 10 - Science',
      Description: 'Main science curriculum for grade 10',
      Thumbnail: 'https://example.com/course-thumb.png',
      Start: '2026-09-01',
      End: '2027-06-15',
    },
  },
  'courseRoutes.js:PATCH:/:id': {
    body: {
      Name: 'Grade 10 - Science & Technology (Updated)',
      Description: 'Updated curriculum with new topics',
    },
  },
  'subjectRoutes.js:POST:/': {
    body: {
      Course_id: '{{course_id}}',
      Teacher_id: 1,
      name: 'Physics',
      Description: 'Mechanics, electricity, and waves',
    },
  },
  'subjectRoutes.js:PATCH:/:id': {
    body: {
      name: 'Physics & Advanced Topics',
      Description: 'Updated with modern physics concepts',
    },
  },
  'organizationRoutes.js:GET:/': {
    query: [
      { key: 'skip', value: '0' },
      { key: 'limit', value: '10' },
    ],
  },
  'subjectRoutes.js:GET:/': {
    query: [{ key: 'courseId', value: '{{course_id}}' }],
  },
};

const knownFolders = Object.values(folderMapping).map((entry) => entry.folder);
const envDefaults = [
  { key: 'base_url', value: 'http://localhost' },
  { key: 'port', value: '5000' },
  { key: 'token', value: '' },
  { key: 'resource_id', value: '' },
];

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => JSON.parse(readText(filePath));
const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildMountMap = () => {
  const appContent = readText(appPath);
  const importMap = new Map();
  const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/routes\/(.+?Routes\.js)['"]/g;
  let match;

  while ((match = importRegex.exec(appContent))) {
    importMap.set(match[1], match[2]);
  }

  const mountMap = new Map();
  const useRegex = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g;
  while ((match = useRegex.exec(appContent))) {
    const routeFile = importMap.get(match[2]);
    if (routeFile) {
      mountMap.set(routeFile, match[1]);
    }
  }

  return mountMap;
};

const listRouteFiles = () =>
  fs
    .readdirSync(routesDir)
    .filter((fileName) => fileName.endsWith('Routes.js'))
    .sort((left, right) => left.localeCompare(right));

const getControllerFilePath = (routeFileName) => {
  const controllerFileName = routeFileName.replace('Routes.js', 'Controller.js');
  return path.join(controllersDir, controllerFileName);
};

const extractControllerSnippet = (content, controllerName) => {
  const startMarker = `export const ${controllerName}`;
  const startIndex = content.indexOf(startMarker);

  if (startIndex === -1) {
    return '';
  }

  const remainder = content.slice(startIndex + startMarker.length);
  const nextExportOffset = remainder.indexOf('\nexport const ');
  if (nextExportOffset === -1) {
    return content.slice(startIndex);
  }

  return content.slice(startIndex, startIndex + startMarker.length + nextExportOffset);
};

const extractQueryParams = (routeFileName, controllerName) => {
  const controllerPath = getControllerFilePath(routeFileName);
  if (!fs.existsSync(controllerPath)) {
    return [];
  }

  const content = readText(controllerPath);
  const snippet = extractControllerSnippet(content, controllerName);
  if (!snippet) {
    return [];
  }

  const params = new Set();
  const queryRegex = /req\.query(?:\?\.|\.)([A-Za-z_][A-Za-z0-9_]*)/g;
  let match;

  while ((match = queryRegex.exec(snippet))) {
    params.add(match[1]);
  }

  return [...params].map((param) => ({ key: param, value: '' }));
};

const normalizePath = (routePath) => {
  if (!routePath || routePath === '/') {
    return '/';
  }

  return routePath.startsWith('/') ? routePath : `/${routePath}`;
};

const toEnvVarName = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const resolveParamEnvVar = (routeFileName, paramName) => {
  if (paramName === 'id' && folderMapping[routeFileName]?.envVar) {
    return folderMapping[routeFileName].envVar;
  }

  const named = toEnvVarName(paramName);
  return named.endsWith('_id') ? named : `${named}_id`;
};

const buildResolvedPath = (routeFileName, basePath, routePath, discoveredEnvVars) => {
  const normalizedBasePath = basePath.endsWith('/') && basePath !== '/' ? basePath.slice(0, -1) : basePath;
  const normalizedRoutePath = normalizePath(routePath);
  const joined = normalizedRoutePath === '/' ? normalizedBasePath : `${normalizedBasePath}${normalizedRoutePath}`;

  const resolved = joined.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, paramName) => {
    const envVar = resolveParamEnvVar(routeFileName, paramName);
    discoveredEnvVars.add(envVar);
    return `{{${envVar}}}`;
  });

  return resolved;
};

const buildUrlObject = (rawPath, queryParams = []) => {
  const cleanPath = rawPath.replace(/^\/+/, '');
  return {
    raw:
      queryParams.length > 0
        ? `{{base_url}}:{{port}}${rawPath}?${queryParams
            .map((entry) => `${entry.key}=${entry.value}`)
            .join('&')}`
        : `{{base_url}}:{{port}}${rawPath}`,
    host: ['{{base_url}}'],
    port: '{{port}}',
    path: cleanPath ? cleanPath.split('/') : [],
    ...(queryParams.length > 0 ? { query: queryParams } : {}),
  };
};

const buildHeaders = (requiresAuth, hasBody) => {
  const headers = [];

  if (requiresAuth) {
    headers.push({ key: 'Authorization', value: 'Bearer {{token}}' });
  }

  if (hasBody) {
    headers.push({ key: 'Content-Type', value: 'application/json' });
  }

  return headers;
};

const stringifyExampleBody = (body) => JSON.stringify(body, null, 2);

const buildRequestBody = (routeFileName, method, routePath) => {
  const signature = `${routeFileName}:${method}:${normalizePath(routePath)}`;
  const example = requestExamples[signature];

  if (!example) {
    return null;
  }

  if (example.formdata) {
    return {
      mode: 'formdata',
      formdata: example.formdata,
    };
  }

  if (example.body) {
    return {
      mode: 'raw',
      raw: stringifyExampleBody(example.body),
    };
  }

  return null;
};

const buildQueryForEndpoint = (routeFileName, method, routePath, controllerName) => {
  const signature = `${routeFileName}:${method}:${normalizePath(routePath)}`;
  const example = requestExamples[signature];

  if (example?.query) {
    return example.query;
  }

  if (method === 'GET') {
    return extractQueryParams(routeFileName, controllerName);
  }

  return [];
};

const getEntityLabel = (routeFileName) => {
  const folder = folderMapping[routeFileName]?.folder ?? routeFileName.replace('Routes.js', '');
  if (folder.endsWith('s')) {
    return folder.slice(0, -1);
  }

  return folder;
};

const buildRequestName = (routeFileName, method, routePath) => {
  const normalized = normalizePath(routePath);
  const entityLabel = getEntityLabel(routeFileName);

  if (routeFileName === 'authRoutes.js') {
    const authNames = {
      'POST:/organization/register': 'Register Organization',
      'POST:/organization/login': 'Login Organization',
      'POST:/user/login': 'Login User',
    };

    return authNames[`${method}:${normalized}`] ?? `${method} ${normalized}`;
  }

  if (routeFileName === 'userRoutes.js' && normalized === '/generate-users') {
    return 'Generate Users from Excel';
  }

  if (method === 'POST' && normalized === '/') {
    return `Create ${entityLabel}`;
  }

  if (method === 'GET' && normalized === '/') {
    return `List All ${folderMapping[routeFileName]?.folder ?? `${entityLabel}s`}`;
  }

  if (method === 'GET' && normalized.includes(':')) {
    return `Get ${entityLabel} By ID`;
  }

  if ((method === 'PATCH' || method === 'PUT') && normalized.includes(':')) {
    return `Update ${entityLabel}`;
  }

  if (method === 'DELETE' && normalized.includes(':')) {
    return `Delete ${entityLabel}`;
  }

  return `${method} ${normalized}`;
};

const buildStatusCodes = (method, routePath) => {
  const normalized = normalizePath(routePath);

  if (method === 'POST' && normalized !== '/organization/login' && normalized !== '/user/login') {
    return [201];
  }

  if (method === 'DELETE') {
    return [200, 204];
  }

  return [200, 201];
};

const buildTestScript = (routeFileName, method, routePath) => {
  const statusCodes = buildStatusCodes(method, routePath);
  const resourceEnvVar = folderMapping[routeFileName]?.envVar ?? 'resource_id';
  const lines = [
    'pm.test("Status code is correct", function () {',
    `  pm.expect(pm.response.code).to.be.oneOf([${statusCodes.join(', ')}]);`,
    '});',
    '',
    'pm.test("Response time < 2000ms", function () {',
    '  pm.expect(pm.response.responseTime).to.be.below(2000);',
    '});',
    '',
    'pm.test("Response is JSON", function () {',
    '  pm.response.to.be.json;',
    '});',
    '',
    'const res = pm.response.json();',
    '',
    'pm.test("Response has expected structure", function () {',
    '  pm.expect(res).to.be.an("object");',
    '  pm.expect(res).to.have.any.keys("message", "data", "errors");',
    '});',
    '',
    'if (res.data?.id) {',
    '  pm.environment.set("resource_id", String(res.data.id));',
    `  pm.environment.set("${resourceEnvVar}", String(res.data.id));`,
    '}',
  ];

  if (routeFileName === 'authRoutes.js') {
    lines.push('', 'if (res.data?.token) {', '  pm.environment.set("token", res.data.token);', '}');
    lines.push(
      '',
      'if (res.data?.organization?.id) {',
      '  pm.environment.set("organization_id", String(res.data.organization.id));',
      '}'
    );
    lines.push('', 'if (res.data?.user?.id) {', '  pm.environment.set("user_id", String(res.data.user.id));', '}');
  }

  return [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: lines,
      },
    },
  ];
};

const flattenRequests = (items, collector = []) => {
  for (const item of items) {
    if (item.request) {
      collector.push(item);
      continue;
    }

    if (Array.isArray(item.item)) {
      flattenRequests(item.item, collector);
    }
  }

  return collector;
};

const ensureFolder = (collection, folderName) => {
  let folder = collection.item.find((entry) => entry.name === folderName && Array.isArray(entry.item));
  if (!folder) {
    folder = { name: folderName, item: [] };
    collection.item.push(folder);
  }

  return folder;
};

const pruneUnmappedEmptyFolders = (collection) => {
  const mappedFolderNames = new Set(knownFolders);
  collection.item = collection.item.filter((entry) => {
    if (!Array.isArray(entry.item)) {
      return true;
    }

    if (mappedFolderNames.has(entry.name)) {
      return true;
    }

    return entry.item.length > 0;
  });
};

const parseRoutes = (content) => {
  const endpoints = [];
  const routeRegex = /router\.(get|post|put|patch|delete)\(\s*(['"])(.*?)\2\s*,([\s\S]*?)\);/g;
  const hasGlobalAuth = /router\.use\(\s*authMiddleware\b/.test(content);
  let match;

  while ((match = routeRegex.exec(content))) {
    const method = match[1].toUpperCase();
    const routePath = match[3];
    const args = match[4];
    const segments = args
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    const controllerName = segments[segments.length - 1]?.replace(/[);]/g, '') ?? '';
    endpoints.push({
      method,
      routePath,
      controllerName,
      requiresAuth: hasGlobalAuth || /\bauthMiddleware\b/.test(args),
    });
  }

  return endpoints;
};

const buildRequestItem = ({ routeFileName, method, routePath, basePath, controllerName, requiresAuth, envVars }) => {
  const body = buildRequestBody(routeFileName, method, routePath);
  const queryParams = buildQueryForEndpoint(routeFileName, method, routePath, controllerName);
  const resolvedPath = buildResolvedPath(routeFileName, basePath, routePath, envVars);
  const url = buildUrlObject(resolvedPath, queryParams);
  const hasJsonBody = body?.mode === 'raw';

  return {
    name: buildRequestName(routeFileName, method, routePath),
    event: buildTestScript(routeFileName, method, routePath),
    request: {
      method,
      header: buildHeaders(requiresAuth, hasJsonBody),
      ...(body ? { body } : {}),
      url,
    },
  };
};

const syncEnvironment = (environment, envVars) => {
  const existingKeys = new Set(environment.values.map((entry) => entry.key));
  for (const defaultEntry of envDefaults) {
    if (!existingKeys.has(defaultEntry.key)) {
      environment.values.push({
        key: defaultEntry.key,
        value: defaultEntry.value,
        type: 'string',
        enabled: true,
      });
      existingKeys.add(defaultEntry.key);
    }
  }

  for (const envVar of [...envVars].sort((left, right) => left.localeCompare(right))) {
    if (!existingKeys.has(envVar)) {
      environment.values.push({
        key: envVar,
        value: '',
        type: 'string',
        enabled: true,
      });
      existingKeys.add(envVar);
    }
  }
};

const main = () => {
  const collection = readJson(collectionPath);
  const environment = readJson(environmentPath);
  const mountMap = buildMountMap();
  const routeFiles = listRouteFiles();
  const envVars = new Set();

  for (const defaultEntry of envDefaults) {
    envVars.add(defaultEntry.key);
  }

  for (const folderName of knownFolders) {
    ensureFolder(collection, folderName);
  }

  const existingRequests = new Set(
    flattenRequests(collection.item).map(
      (item) => `${item.request.method.toUpperCase()} ${item.request.url.raw}`
    )
  );

  let appendedCount = 0;

  for (const routeFileName of routeFiles) {
    const routeFilePath = path.join(routesDir, routeFileName);
    const routeContent = readText(routeFilePath);
    const endpoints = parseRoutes(routeContent);
    const folderConfig = folderMapping[routeFileName];
    const folderName = folderConfig?.folder ?? routeFileName.replace('Routes.js', '');
    const basePath = mountMap.get(routeFileName) ?? folderConfig?.fallbackBasePath;

    if (!basePath || endpoints.length === 0) {
      continue;
    }

    const folder = ensureFolder(collection, folderName);

    for (const endpoint of endpoints) {
      const requestItem = buildRequestItem({
        routeFileName,
        method: endpoint.method,
        routePath: endpoint.routePath,
        basePath,
        controllerName: endpoint.controllerName,
        requiresAuth: endpoint.requiresAuth,
        envVars,
      });

      const signature = `${requestItem.request.method.toUpperCase()} ${requestItem.request.url.raw}`;
      if (existingRequests.has(signature)) {
        continue;
      }

      folder.item.push(requestItem);
      existingRequests.add(signature);
      appendedCount += 1;
    }
  }

  pruneUnmappedEmptyFolders(collection);
  syncEnvironment(environment, envVars);
  writeJson(collectionPath, collection);
  writeJson(environmentPath, environment);

  console.log(`Postman sync complete. Added ${appendedCount} request(s).`);
};

main();