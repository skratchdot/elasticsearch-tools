jest.mock('../../lib/importer.js');

test('es-import-mappings', () => {
  const importerMock = require('../../lib/importer');
  require('../../lib/es-import-mappings');
  expect(importerMock.indicesImport.mock.calls).toMatchSnapshot();
});
