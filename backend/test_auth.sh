# 1. Signup Request
curl -X POST http://localhost:8000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "password123", "name": "User Name"}'

# 2. Login Request
# This will return a JSON with "access_token"
curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "password123"}'     

# 3. Get Current User Object 
# Replace YOUR_ACCESS_TOKEN with the token from the login step
curl -X GET http://localhost:8000/api/auth/me \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Example Protected Route (Process Event JSON)
curl -X POST http://localhost:8000/api/process-event-json \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{"text": "I have a math exam tomorrow at 10 AM in Room 101."}'
