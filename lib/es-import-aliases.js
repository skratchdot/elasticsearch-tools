#!/usr/bin/env node

require('./importer').indicesImport('putAlias', 'aliases', 'name', {
  timeout: 'Date, Number — Explicit operation timeout',
  masterTimeout: 'Date, Number — Specify timeout for connection to master'
});
