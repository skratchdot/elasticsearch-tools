module.exports = async (client, index, type) => {
  // build first index
  const data = [
    ['a', 0, 50],
    ['b', 0, 50],
    ['c', 25, 50],
    ['d', 50, 50]
  ];
  let currentId = 1;
  for (let i = 0; i < data.length; i++) {
    const [ group, start, numDocs ] = data[i];
    for (let j = start; j < numDocs; j++) {
      await client.index({
        index,
        type,
        id: currentId++,
        refresh: 'true',
        body: {
          title: `temp-data-${group}-${j}`,
          group: group,
          value: j
        }
      });
    }
  }
};
