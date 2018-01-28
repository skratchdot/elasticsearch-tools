jest.mock('../../lib/importer.js');

test('es-import-settings', () => {
  const importerMock = require('../../lib/importer');
  require('../../lib/es-import-settings');
  expect(importerMock.indicesImport.mock.calls).toMatchSnapshot();
});
