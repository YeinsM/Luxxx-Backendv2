#!/usr/bin/env node

/**
 * Luxxx MCP Server - Servidor de automatización del proyecto
 * 
 * Este server MCP permite que Copilot:
 * - Pruebe endpoints de la API backend
 * - Ejecute migraciones de base de datos
 * - Verifique el estado de todos los servicios
 * - Genere código boilerplate
 * - Gestione el entorno de desarrollo
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

// ══════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════
// SWITCH: 0 = localhost, 1 = DevTunnels
const USE_TUNNEL = 1;

const BACKEND_URL = USE_TUNNEL
  ? 'https://v9xj6vhl-5000.use2.devtunnels.ms'
  : (process.env.BACKEND_URL || 'http://localhost:5000');
const FRONTEND_URL = USE_TUNNEL
  ? 'https://v9xj6vhl-3000.use2.devtunnels.ms'
  : (process.env.FRONTEND_URL || 'http://localhost:3000');
const DATABASE_URL = process.env.DATABASE_URL || '';
const PROJECT_ROOT = resolve(join(import.meta.dirname, '..'));
const WORKSPACE_ROOT = resolve(join(PROJECT_ROOT, '..'));

// ══════════════════════════════════════════════════════════════
// Server Setup
// ══════════════════════════════════════════════════════════════
const server = new Server(
  {
    name: 'luxxx-project-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ══════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════

async function httpRequest(method, path, body = null, headers = {}) {
  const url = `${BACKEND_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: data,
      ok: response.ok,
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Connection Failed',
      error: error.message,
      hint: `¿Está el backend corriendo en ${BACKEND_URL}? Ejecuta: cd Luxxx-Backendv2 && npm run dev`,
    };
  }
}

function runCommand(command, cwd) {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stderr: error.stderr?.toString().trim(),
      stdout: error.stdout?.toString().trim(),
    };
  }
}

function getProjectInfo() {
  const backendPkg = JSON.parse(
    readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8')
  );
  const frontendPkgPath = join(WORKSPACE_ROOT, 'Luxxx-Frontend', 'package.json');
  const frontendPkg = existsSync(frontendPkgPath)
    ? JSON.parse(readFileSync(frontendPkgPath, 'utf8'))
    : null;

  return { backend: backendPkg, frontend: frontendPkg };
}

// ══════════════════════════════════════════════════════════════
// Tools Definition
// ══════════════════════════════════════════════════════════════
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ─── API Testing Tools ───
      {
        name: 'api_health_check',
        description:
          'Verifica el estado del backend API y frontend. Comprueba si los servidores están corriendo y responden correctamente.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'api_request',
        description:
          'Hace una petición HTTP al backend API de Luxxx. Soporta GET, POST, PUT, DELETE, PATCH. Útil para probar endpoints.',
        inputSchema: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
              description: 'HTTP method',
            },
            path: {
              type: 'string',
              description: 'API path (ej: /api/auth/login, /api/health)',
            },
            body: {
              type: 'object',
              description: 'Request body (para POST/PUT/PATCH)',
            },
            token: {
              type: 'string',
              description: 'JWT token para autenticación (Bearer)',
            },
          },
          required: ['method', 'path'],
        },
      },
      {
        name: 'api_test_auth_flow',
        description:
          'Ejecuta un flujo completo de autenticación: registra un usuario de prueba, hace login y obtiene el perfil. Perfecto para verificar que el auth funciona end-to-end.',
        inputSchema: {
          type: 'object',
          properties: {
            userType: {
              type: 'string',
              enum: ['escort', 'member', 'agency', 'club'],
              description: 'Tipo de usuario a registrar para la prueba',
              default: 'member',
            },
          },
        },
      },

      // ─── Database Tools ───
      {
        name: 'db_run_migration',
        description:
          'Ejecuta las migraciones de base de datos SQL del directorio database/migrations/. Aplica todas las migraciones pendientes en orden.',
        inputSchema: {
          type: 'object',
          properties: {
            migrationFile: {
              type: 'string',
              description:
                'Nombre específico del archivo de migración a ejecutar. Si no se especifica, lista las migraciones disponibles.',
            },
          },
        },
      },
      {
        name: 'db_show_schema',
        description:
          'Muestra el schema SQL actual de la base de datos Luxxx. Lee el archivo schema.sql del proyecto.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // ─── Project Management Tools ───
      {
        name: 'project_status',
        description:
          'Muestra un resumen completo del estado del proyecto: versiones, dependencias, estructura, endpoints disponibles, estado de servicios.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'project_list_endpoints',
        description:
          'Lista todos los endpoints API disponibles en el backend analizando los archivos de rutas.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'project_check_env',
        description:
          'Verifica la configuración del entorno (.env). Comprueba qué variables están configuradas y cuáles faltan, sin exponer valores sensibles.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'project_npm_scripts',
        description:
          'Lista todos los scripts npm disponibles tanto en backend como frontend y permite ejecutar uno.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              enum: ['backend', 'frontend'],
              description: 'Proyecto del cual listar/ejecutar scripts',
            },
            run: {
              type: 'string',
              description: 'Nombre del script a ejecutar (ej: dev, build, lint)',
            },
          },
        },
      },

      // ─── Code Generation Tools ───
      {
        name: 'generate_crud_controller',
        description:
          'Genera un controlador CRUD completo para una entidad siguiendo los patrones del proyecto Luxxx (Express + TypeScript).',
        inputSchema: {
          type: 'object',
          properties: {
            entityName: {
              type: 'string',
              description: 'Nombre de la entidad (ej: profile, review, message)',
            },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['string', 'number', 'boolean', 'date'] },
                  required: { type: 'boolean' },
                },
              },
              description: 'Campos de la entidad',
            },
          },
          required: ['entityName'],
        },
      },
      {
        name: 'generate_api_route',
        description:
          'Genera un archivo de rutas Express para una entidad siguiendo los patrones del proyecto.',
        inputSchema: {
          type: 'object',
          properties: {
            entityName: {
              type: 'string',
              description: 'Nombre de la entidad',
            },
            routes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
                  path: { type: 'string' },
                  description: { type: 'string' },
                },
              },
              description: 'Rutas a generar',
            },
          },
          required: ['entityName'],
        },
      },

      // ─── Utility Tools ───
      {
        name: 'check_dependencies',
        description:
          'Analiza las dependencias del proyecto, verifica vulnerabilidades y muestra actualizaciones disponibles.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              enum: ['backend', 'frontend', 'both'],
              default: 'both',
            },
          },
        },
      },
      {
        name: 'git_summary',
        description:
          'Muestra un resumen del estado de git: rama actual, cambios pendientes, últimos commits.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// ══════════════════════════════════════════════════════════════
// Tools Implementation
// ══════════════════════════════════════════════════════════════
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // ─── api_health_check ───
    case 'api_health_check': {
      const [backendHealth, frontendHealth] = await Promise.allSettled([
        httpRequest('GET', '/api/health'),
        fetch(FRONTEND_URL)
          .then((r) => ({ status: r.status, ok: r.ok }))
          .catch((e) => ({ status: 0, error: e.message })),
      ]);

      const backend =
        backendHealth.status === 'fulfilled' ? backendHealth.value : { error: 'Failed' };
      const frontend =
        frontendHealth.status === 'fulfilled' ? frontendHealth.value : { error: 'Failed' };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                backend: {
                  url: BACKEND_URL,
                  ...backend,
                },
                frontend: {
                  url: FRONTEND_URL,
                  ...frontend,
                },
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── api_request ───
    case 'api_request': {
      const headers = {};
      if (args.token) {
        headers['Authorization'] = `Bearer ${args.token}`;
      }
      const result = await httpRequest(args.method, args.path, args.body, headers);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                request: {
                  method: args.method,
                  url: `${BACKEND_URL}${args.path}`,
                  body: args.body || null,
                },
                response: result,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── api_test_auth_flow ───
    case 'api_test_auth_flow': {
      const userType = args?.userType || 'member';
      const testEmail = `test_${Date.now()}@luxxx-test.com`;
      const testPassword = 'TestPassword123!';
      const results = { steps: [] };

      // Step 1: Register
      const registerBody = {
        email: testEmail,
        password: testPassword,
        user_type: userType,
      };

      // Add required fields based on user type
      if (userType === 'escort') {
        Object.assign(registerBody, {
          name: 'Test Escort',
          phone: '+1234567890',
          city: 'Test City',
          age: 25,
        });
      } else if (userType === 'member') {
        Object.assign(registerBody, {
          username: `testmember_${Date.now()}`,
          city: 'Test City',
        });
      } else if (userType === 'agency') {
        Object.assign(registerBody, {
          agency_name: 'Test Agency',
          phone: '+1234567890',
          city: 'Test City',
        });
      } else if (userType === 'club') {
        Object.assign(registerBody, {
          club_name: 'Test Club',
          phone: '+1234567890',
          address: '123 Test St',
          city: 'Test City',
        });
      }

      const registerResult = await httpRequest(
        'POST',
        `/api/auth/register/${userType}`,
        registerBody
      );
      results.steps.push({
        step: '1. Register',
        success: registerResult.ok,
        status: registerResult.status,
        body: registerResult.body,
      });

      // Step 2: Login
      const loginResult = await httpRequest('POST', '/api/auth/login', {
        email: testEmail,
        password: testPassword,
      });
      results.steps.push({
        step: '2. Login',
        success: loginResult.ok,
        status: loginResult.status,
        body: loginResult.body,
      });

      // Step 3: Get profile
      const token = loginResult.body?.data?.token;
      if (token) {
        const profileResult = await httpRequest('GET', '/api/auth/me', null, {
          Authorization: `Bearer ${token}`,
        });
        results.steps.push({
          step: '3. Get Profile',
          success: profileResult.ok,
          status: profileResult.status,
          body: profileResult.body,
        });
      } else {
        results.steps.push({
          step: '3. Get Profile',
          success: false,
          error: 'No token received from login',
        });
      }

      results.summary = {
        userType,
        testEmail,
        allPassed: results.steps.every((s) => s.success),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }

    // ─── db_run_migration ───
    case 'db_run_migration': {
      const migrationsDir = join(PROJECT_ROOT, 'database', 'migrations');
      if (!existsSync(migrationsDir)) {
        return {
          content: [
            {
              type: 'text',
              text: 'No se encontró el directorio de migraciones: database/migrations/',
            },
          ],
        };
      }

      const migrations = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      if (args?.migrationFile) {
        const migrationPath = join(migrationsDir, args.migrationFile);
        if (!existsSync(migrationPath)) {
          return {
            content: [
              {
                type: 'text',
                text: `Migración no encontrada: ${args.migrationFile}\nDisponibles: ${migrations.join(', ')}`,
              },
            ],
          };
        }
        const sql = readFileSync(migrationPath, 'utf8');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  migration: args.migrationFile,
                  sql,
                  hint: 'Para ejecutar esta migración, usa el MCP server de PostgreSQL con la tool "query" y pasa el contenido SQL.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                availableMigrations: migrations,
                directory: migrationsDir,
                hint: 'Especifica migrationFile para ver el contenido de una migración específica.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── db_show_schema ───
    case 'db_show_schema': {
      const schemaPath = join(PROJECT_ROOT, 'database', 'schema.sql');
      if (!existsSync(schemaPath)) {
        return {
          content: [{ type: 'text', text: 'Schema file not found: database/schema.sql' }],
        };
      }
      const schema = readFileSync(schemaPath, 'utf8');
      return {
        content: [
          {
            type: 'text',
            text: `-- Luxxx Database Schema --\n\n${schema}`,
          },
        ],
      };
    }

    // ─── project_status ───
    case 'project_status': {
      const info = getProjectInfo();
      const gitResult = runCommand('git log --oneline -5', WORKSPACE_ROOT);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                project: 'Luxxx Platform',
                backend: {
                  name: info.backend.name,
                  version: info.backend.version,
                  description: info.backend.description,
                  scripts: Object.keys(info.backend.scripts || {}),
                  dependencies: Object.keys(info.backend.dependencies || {}),
                  devDependencies: Object.keys(info.backend.devDependencies || {}),
                },
                frontend: info.frontend
                  ? {
                      name: info.frontend.name,
                      version: info.frontend.version,
                      scripts: Object.keys(info.frontend.scripts || {}),
                      dependencies: Object.keys(info.frontend.dependencies || {}),
                      devDependencies: Object.keys(info.frontend.devDependencies || {}),
                    }
                  : 'Not found',
                recentCommits: gitResult.success ? gitResult.output : 'Git not available',
                environment: {
                  backendUrl: BACKEND_URL,
                  frontendUrl: FRONTEND_URL,
                  databaseConfigured: !!DATABASE_URL,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── project_list_endpoints ───
    case 'project_list_endpoints': {
      const routesDir = join(PROJECT_ROOT, 'src', 'routes');
      const endpoints = [];

      if (existsSync(routesDir)) {
        const routeFiles = readdirSync(routesDir).filter((f) => f.endsWith('.ts'));
        for (const file of routeFiles) {
          const content = readFileSync(join(routesDir, file), 'utf8');
          const routeMatches = content.matchAll(
            /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi
          );
          for (const match of routeMatches) {
            endpoints.push({
              method: match[1].toUpperCase(),
              path: match[2],
              file,
            });
          }
        }
      }

      // Also check the main index for root-level routes
      const mainRoutes = readFileSync(join(PROJECT_ROOT, 'src', 'index.ts'), 'utf8');
      const mainMatches = mainRoutes.matchAll(
        /app\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi
      );
      for (const match of mainMatches) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          file: 'index.ts (root)',
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                baseUrl: BACKEND_URL,
                apiPrefix: '/api',
                endpoints,
                total: endpoints.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── project_check_env ───
    case 'project_check_env': {
      const envExamplePath = join(PROJECT_ROOT, '.env.example');
      const envPath = join(PROJECT_ROOT, '.env');

      const envExample = existsSync(envExamplePath)
        ? readFileSync(envExamplePath, 'utf8')
        : null;
      const envFile = existsSync(envPath) ? readFileSync(envPath, 'utf8') : null;

      const requiredVars = envExample
        ? envExample
            .split('\n')
            .filter((l) => l.includes('=') && !l.startsWith('#'))
            .map((l) => l.split('=')[0].trim())
        : [];

      const configuredVars = envFile
        ? envFile
            .split('\n')
            .filter((l) => l.includes('=') && !l.startsWith('#'))
            .reduce((acc, l) => {
              const [key, ...val] = l.split('=');
              acc[key.trim()] = val.join('=').trim() ? '✅ Set' : '⚠️ Empty';
              return acc;
            }, {})
        : {};

      const missing = requiredVars.filter((v) => !configuredVars[v]);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                envFileExists: !!envFile,
                envExampleExists: !!envExample,
                variables: configuredVars,
                missing,
                allConfigured: missing.length === 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── project_npm_scripts ───
    case 'project_npm_scripts': {
      const info = getProjectInfo();
      const project = args?.project;

      if (args?.run && project) {
        const cwd =
          project === 'backend'
            ? PROJECT_ROOT
            : join(WORKSPACE_ROOT, 'Luxxx-Frontend');
        const result = runCommand(`npm run ${args.run}`, cwd);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  project,
                  script: args.run,
                  ...result,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                backend: info.backend.scripts || {},
                frontend: info.frontend?.scripts || {},
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── generate_crud_controller ───
    case 'generate_crud_controller': {
      const entity = args.entityName.toLowerCase();
      const Entity = entity.charAt(0).toUpperCase() + entity.slice(1);
      const fields = args.fields || [];

      const fieldsInterface = fields.length
        ? fields
            .map((f) => `  ${f.name}${f.required ? '' : '?'}: ${f.type};`)
            .join('\n')
        : '  // Add fields here';

      const code = `import { Request, Response, NextFunction } from 'express';
import { getDatabaseService } from '../services/database.service';

// Interface
export interface ${Entity} {
  id: string;
${fieldsInterface}
  created_at: Date;
  updated_at: Date;
}

// GET all
export const getAll${Entity}s = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement with database service
    res.json({ success: true, data: [], message: '${Entity}s retrieved successfully' });
  } catch (error) {
    next(error);
  }
};

// GET by ID
export const get${Entity}ById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Implement with database service
    res.json({ success: true, data: null, message: '${Entity} retrieved successfully' });
  } catch (error) {
    next(error);
  }
};

// POST create
export const create${Entity} = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    // TODO: Implement with database service
    res.status(201).json({ success: true, data, message: '${Entity} created successfully' });
  } catch (error) {
    next(error);
  }
};

// PUT update
export const update${Entity} = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = req.body;
    // TODO: Implement with database service
    res.json({ success: true, data: { id, ...data }, message: '${Entity} updated successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const delete${Entity} = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Implement with database service
    res.json({ success: true, message: '${Entity} deleted successfully' });
  } catch (error) {
    next(error);
  }
};
`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                entity: Entity,
                suggestedFile: `src/controllers/${entity}.controller.ts`,
                code,
                nextSteps: [
                  `Crear archivo: src/controllers/${entity}.controller.ts`,
                  `Crear rutas: src/routes/${entity}.routes.ts`,
                  `Registrar en src/routes/index.ts`,
                  `Crear migración SQL en database/migrations/`,
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── generate_api_route ───
    case 'generate_api_route': {
      const entity = args.entityName.toLowerCase();
      const Entity = entity.charAt(0).toUpperCase() + entity.slice(1);
      const routes = args.routes || [
        { method: 'GET', path: '/', description: `Get all ${entity}s` },
        { method: 'GET', path: '/:id', description: `Get ${entity} by ID` },
        { method: 'POST', path: '/', description: `Create ${entity}` },
        { method: 'PUT', path: '/:id', description: `Update ${entity}` },
        { method: 'DELETE', path: '/:id', description: `Delete ${entity}` },
      ];

      const routeHandlers = routes
        .map((r) => {
          const handlerName = (() => {
            if (r.method === 'GET' && r.path === '/') return `getAll${Entity}s`;
            if (r.method === 'GET') return `get${Entity}ById`;
            if (r.method === 'POST') return `create${Entity}`;
            if (r.method === 'PUT') return `update${Entity}`;
            if (r.method === 'DELETE') return `delete${Entity}`;
            return `handle${Entity}`;
          })();
          return `// ${r.description}\nrouter.${r.method.toLowerCase()}('${r.path}', ${handlerName});`;
        })
        .join('\n\n');

      const code = `import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAll${Entity}s,
  get${Entity}ById,
  create${Entity},
  update${Entity},
  delete${Entity},
} from '../controllers/${entity}.controller';

const router = Router();

${routeHandlers}

export default router;
`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                entity: Entity,
                suggestedFile: `src/routes/${entity}.routes.ts`,
                code,
                registrationCode: `// Add to src/routes/index.ts:\nimport ${entity}Routes from './${entity}.routes';\nrouter.use('/${entity}s', ${entity}Routes);`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ─── check_dependencies ───
    case 'check_dependencies': {
      const project = args?.project || 'both';
      const results = {};

      if (project === 'backend' || project === 'both') {
        const outdated = runCommand('npm outdated --json 2>nul || echo {}', PROJECT_ROOT);
        results.backend = {
          outdated: outdated.success ? JSON.parse(outdated.output || '{}') : 'Could not check',
        };
      }

      if (project === 'frontend' || project === 'both') {
        const frontendDir = join(WORKSPACE_ROOT, 'Luxxx-Frontend');
        const outdated = runCommand('npm outdated --json 2>nul || echo {}', frontendDir);
        results.frontend = {
          outdated: outdated.success ? JSON.parse(outdated.output || '{}') : 'Could not check',
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }

    // ─── git_summary ───
    case 'git_summary': {
      const branch = runCommand('git branch --show-current', WORKSPACE_ROOT);
      const status = runCommand('git status --short', WORKSPACE_ROOT);
      const log = runCommand('git log --oneline -10', WORKSPACE_ROOT);
      const remotes = runCommand('git remote -v', WORKSPACE_ROOT);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                currentBranch: branch.success ? branch.output : 'Unknown',
                changedFiles: status.success ? status.output.split('\n').filter(Boolean) : [],
                recentCommits: log.success ? log.output.split('\n') : [],
                remotes: remotes.success ? remotes.output : 'No remotes',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true,
      };
  }
});

// ══════════════════════════════════════════════════════════════
// Resources - Expose project data as readable resources
// ══════════════════════════════════════════════════════════════
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'luxxx://schema/database',
        mimeType: 'text/plain',
        name: 'Database Schema',
        description: 'Schema SQL actual de la base de datos Luxxx',
      },
      {
        uri: 'luxxx://config/env-example',
        mimeType: 'text/plain',
        name: 'Environment Example',
        description: 'Variables de entorno requeridas (.env.example)',
      },
      {
        uri: 'luxxx://docs/api',
        mimeType: 'text/plain',
        name: 'API Documentation',
        description: 'Documentación de la API',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'luxxx://schema/database': {
      const schemaPath = join(PROJECT_ROOT, 'database', 'schema.sql');
      const content = existsSync(schemaPath) ? readFileSync(schemaPath, 'utf8') : 'Schema not found';
      return { contents: [{ uri, mimeType: 'text/plain', text: content }] };
    }
    case 'luxxx://config/env-example': {
      const envPath = join(PROJECT_ROOT, '.env.example');
      const content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '.env.example not found';
      return { contents: [{ uri, mimeType: 'text/plain', text: content }] };
    }
    case 'luxxx://docs/api': {
      const docsPath = join(PROJECT_ROOT, 'docs', 'README.md');
      const content = existsSync(docsPath) ? readFileSync(docsPath, 'utf8') : 'API docs not found';
      return { contents: [{ uri, mimeType: 'text/plain', text: content }] };
    }
    default:
      return { contents: [{ uri, mimeType: 'text/plain', text: `Resource not found: ${uri}` }] };
  }
});

// ══════════════════════════════════════════════════════════════
// Start Server
// ══════════════════════════════════════════════════════════════
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Luxxx MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
