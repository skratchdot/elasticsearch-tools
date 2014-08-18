#!/usr/bin/env node

require('./exporter').indicesExport('getAliases', 'aliases', {
	index: 'String, String[], Boolean — A comma-separated list of index names',
	local: 'Boolean — Return local information, do not retrieve the state from master node (default: false)',
	name: 'String, String[], Boolean — The name of the settings that should be included'
});
