#!/usr/bin/env node

require('./exporter').indicesExport('getSettings', 'settings', {
	index: 'String, String[], Boolean — A comma-separated list of index names',
	ignoreUnavailable: 'Boolean — Whether specified concrete indices should be ignored when unavailable (missing or closed)',
	allowNoIndices: 'Boolean — Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes _all string or when no indices have been specified)',
	expandWildcards: 'String — Whether to expand wildcard expression to concrete indices that are open, closed or both.',
	local: 'Boolean — Return local information, do not retrieve the state from master node (default: false)',
	name: 'String, String[], Boolean — The name of the settings that should be included'
});
