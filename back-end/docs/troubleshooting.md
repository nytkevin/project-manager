# Troubleshooting

## Cannot find name 'process'

Cause:
Node.js type definitions were missing.

Solution:
npm install -D @types/node

Also added:

"types": ["node"]

to tsconfig.json.