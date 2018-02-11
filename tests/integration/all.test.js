const elasticsearch = require('elasticsearch');
const { execSync } = require('child_process');
const insertData = require('./insert-data');

const host = 'http://localhost:20202';
const client = new elasticsearch.Client({ host });
const commands = ['aliases', 'bulk', 'mappings', 'settings'];
const libdir = `../../lib/`;
const workingdir = `../fixtures/working`;
const importdir = `../fixtures/import-tests/`;

const run = (type, cmd) => `node ${libdir}/es-${type}-${cmd} --url ${host}`;

const testAllExports = async (prefix) => {
  commands.forEach(command => {
    const cmd = `${run('export', command)} --file ${workingdir}/${prefix}-${command}.txt`;
    try {
      const result = execSync(cmd, { cwd: __dirname }).toString();
      expect(result).toMatchSnapshot();
    } catch (err) {
      expect(err.message).toMatchSnapshot();
    }
  });
};

beforeAll(async () => {
  // eslint-disable-next-line
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
  await client.indices.delete({ index: '*' });
});

describe('with empty db', async () => {
  test('client.indices.stats', async () => {
    const stats = await client.indices.stats();
    expect(stats.indices).toEqual({});
  });
  test('test all exports', async () => {
    await testAllExports('1-empty');
  });
});

describe('insert data with node lib', async () => {
  test('insert data', async () => {
    await insertData(client, 'test-lib', 'groups');
  });
  test('client.indices.stats', async () => {
    const stats = await client.indices.stats();
    expect(Object.keys(stats.indices)).toMatchSnapshot();
  });
  test('test all exports', async () => {
    await testAllExports('2-somedata');
  });
});

describe('delete all indices again', async () => {
  test('delete indices', async () => {
    await client.indices.delete({ index: '*' });
  });
  test('client.indices.stats', async () => {
    const stats = await client.indices.stats();
    expect(stats.indices).toEqual({});
  });
  test('test all exports', async () => {
    await testAllExports('3-emptyagain');
  });
});

describe('importing from files', async () => {
  test('test all imports', async () => {
    ['settings', 'aliases', 'mappings', 'bulk'].forEach(command => {
      const result = execSync(`${run('import', command)} --file ${importdir}/${command}.txt`, { cwd: __dirname }).toString();
      expect(result).toMatchSnapshot();
    });
  });
  test('client.indices.stats', async () => {
    const stats = await client.indices.stats();
    expect(Object.keys(stats.indices)).toMatchSnapshot();
  });
  test('test all exports', async () => {
    await testAllExports('4-afterimports');
  });
});
