# Postman – Learnova Backend

This folder contains the official Postman collection and environment for the Learnova Backend API, plus the sync script to push updates to Postman Cloud.

## Files

- **Learnova_Backend.postman_collection.json** – API requests (Auth, Courses, Subjects, Organizations, Users).
- **Learnova_Local.postman_environment.json** – Local environment variables (`base_url`, `port`, `token`, `course_id`, `subject_id`, `organization_id`, `user_id`, etc.).
- **sync.ps1** – Pushes the collection and environment to Postman Cloud (requires `POSTMAN_API_KEY` in project root `.env`).

## Running API tests automatically (Newman)

From the project root:

1. Start the server: `npm run dev`
2. In another terminal, run the collection: `npm run test:api`

This runs all requests in the collection using the local environment. Ensure the server is running and that environment variables (e.g. `base_url`, `port`) match your setup. For protected endpoints, run **Login Organization** or **Login User** first so `token` is set (or set it manually in the environment).

## Adding a new feature and testing it automatically

When you add a **new API resource** to the backend:

1. **Add a new folder** in `Learnova_Backend.postman_collection.json` with the same pattern as Courses/Subjects:
   - Use URLs: `{{base_url}}:{{port}}/api/<resource>`
   - For protected routes, add header: `Authorization: Bearer {{token}}`
   - Add one request per endpoint (e.g. Create, List, Get By ID, Update, Delete)

2. **Add tests** for each request:
   - Assert status code, e.g. `pm.response.to.have.status(201)` or `pm.response.to.have.status(200)`
   - For create requests, store the new resource id:  
     `pm.environment.set("<resource>_id", pm.response.json().data.id);`

3. **Add any new variables** to `Learnova_Local.postman_environment.json` (e.g. `<resource>_id`).

4. **Sync to Postman Cloud** (optional):  
   `.\postman\sync.ps1`

5. **Run the full collection** to verify everything passes:  
   `npm run test:api`

Any new feature added to the collection is then part of the automatic test run.
