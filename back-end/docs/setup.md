# Backend Setup

## Node.js

Initialized the backend Node.js project.

Command:

npm init -y

Purpose:
Creates package.json and allows the backend to manage dependencies and scripts.


## Express

Command:

npm install express

Purpose:
Express is used to create the REST API and handle HTTP requests.


## TypeScript

Command:

npm install -D typescript

Purpose:
TypeScript provides static type checking for the Node.js backend.


## Node Type Definitions

Command:

npm install -D @types/node

Purpose:
Allows TypeScript to understand Node.js-specific globals such as:

- process
- Buffer
- __dirname

### Problem it fixed

TypeScript showed:

Cannot find name 'process'

The Node type definitions were installed so TypeScript could recognize Node.js APIs.


## TypeScript Configuration

Command:

npx tsc --init

Purpose:
Created tsconfig.json, which controls how TypeScript compiles and checks the backend code.

The following was added:

"types": ["node"]

This allows TypeScript to load Node.js type definitions.


## ES Modules

Added this to package.json:

"type": "module"

Purpose:
Allows the backend to use modern JavaScript syntax:

import ...
export ...

### Problem it fixed

TypeScript previously showed:

ECMAScript imports and exports cannot be written in a CommonJS file.


## Prisma

Commands:

npm install -D prisma @types/pg

npm install @prisma/client @prisma/adapter-pg pg dotenv

Purpose:
Prisma is used as the ORM between the Node.js backend and PostgreSQL.


## Prisma Initialization

Command:

npx prisma init --datasource-provider postgresql

Purpose:
Creates the Prisma configuration and schema required to connect the backend to PostgreSQL.


## Environment Variables

Created:

.env

Added:

DATABASE_URL="..."

Purpose:
Stores the PostgreSQL connection string securely outside the source code.


## Prisma DATABASE_URL Type Error

Problem:

process.env.DATABASE_URL was typed as:

string | undefined

Prisma expected:

string

Solution:

Used !:


Then:

url: process.env.DATABASE_URL!

----------------------------------------------------------------------------------------------------------------------------------------------------

## TypeScript Build Configuration

Updated `tsconfig.json` to define where the backend TypeScript source code is located and where the compiled JavaScript should be generated.

Added:

```json
"rootDir": "./src",
"outDir": "./dist"
```

### Purpose

`rootDir` tells TypeScript that the backend source files will be stored inside:

```text
src/
```

`outDir` tells TypeScript to place the compiled JavaScript files inside:

```text
dist/
```

The build flow will therefore look like:

```text
src/server.ts
      ↓
TypeScript Compiler
      ↓
dist/server.js
```

This is important for deployment because the TypeScript source code must first be compiled into JavaScript before Node.js runs the backend in production.

## Node.js Module Resolution

Added:

```json
"moduleResolution": "NodeNext"
```

alongside:

```json
"module": "NodeNext"
```

### Purpose

`NodeNext` tells TypeScript to follow the modern Node.js module system when resolving imports and exports.

This works together with the following setting in `package.json`:

```json
"type": "module"
```

This allows the backend to consistently use modern ES Module syntax:

```ts
import express from "express";
export default ...
```

instead of CommonJS syntax such as:

```js
const express = require("express");
module.exports = ...
```

This keeps the TypeScript configuration and Node.js module system consistent.
