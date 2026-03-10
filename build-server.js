import { build } from 'esbuild';

async function buildServer() {
  try {
    console.log('🔨 Building server...');
    
    const result = await build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'es2020',
      format: 'esm',
      outdir: 'dist',
      packages: 'external',
      sourcemap: true,
      minify: false,
      keepNames: true,
      external: [
        'express',
        'cors',
        'bcryptjs',
        'passport',
        'passport-local',
        'passport-google-oauth20',
        'express-session',
        'pg',
        'drizzle-orm',
        '@neondatabase/serverless'
      ]
    });
    
    console.log('✅ Server build completed');
    console.log('Output files:', result.outfiles || ['dist/index.js']);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildServer();
