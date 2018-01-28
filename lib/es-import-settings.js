#!/usr/bin/env node

require('./importer').indicesImport('putSettings', 'settings', null, {
  masterTimeout: 'Date, Number — Specify timeout for connection to master',
  ignoreUnavailable:
    'Boolean — Whether specified concrete indices should be ignored when unavailable (missing or closed)',
  allowNoIndices:
    'Boolean — Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes _all string or when no indices have been specified)',
  expandWildcards:
    'String — Whether to expand wildcard expression to concrete indices that are open, closed or both.'
});
