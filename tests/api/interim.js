const expect = require('chai').expect;

function getMatches(arr, value) {
  const matches = [];

  // items are sorted ie. A, B, ..., a, b, ...
  binarySearch(arr, value.toLowerCase(), matches);
  binarySearch(arr, value.toUpperCase(), matches);
  return matches;
}

function binarySearch(items, value, matches) {
  let startIndex = 0;
  let stopIndex = items.length - 1;
  let middle = Math.floor((stopIndex + startIndex) / 2);

  //make sure it's the right value
  const word = items[middle];
  if (!word) {
    return -1;
  } else if (!word.startsWith(value)) {
    if (word < value) {
      return binarySearch(items.slice(middle + 1, items.length), value, matches);
    } else { // word >= value
      return binarySearch(items.slice(0, middle), value, matches);
    }
  } else { // word.startsWith(value)
    matches.push(word);
    return binarySearch(items.slice(0, middle), value, matches) && binarySearch(items.slice(middle + 1, items.length), value, matches)
  }
}

describe.only('ordered items with different cases', () => {
  const ordered = ["AAAAA", "Az", "BB", "Be", "a", "aaaaaaaa"];
  it('multiple matches across different cases', () => {
    const results = getMatches(ordered, "a");
    expect(results.length).to.equal(4);
  });
});

describe('begins with', () => {
  const words = ["aaa", "ba", "bb", "ccc", "cd", "code", "in", "perspective"];
  it('no match', () => {
    const results = getMatches(words, "volvo");
    expect(results.length).to.equal(0);
  });

  it('one match in periphery', () => {
    const results = getMatches(words, "pers");
    expect(results.length).to.equal(1);
  });

  it('one match in middle', () => {
    const results = getMatches(words, "i");
    expect(results.length).to.equal(1);
  });

  it('multiple matches', () => {
    const results = getMatches(words, "b");
    expect(results.length).to.equal(2);
  });
});

describe('exact match', () => {
  const items = ["a", "b", "c", "d", "e", "f",
    "g", "h", "i", "i", "j", "j", "j"
  ];

  it('single match is returned', () => {
    const results = getMatches(items, "b");
    expect(results.length).to.equal(1);
  });

  it('multiple matches are returned', () => {
    const results = getMatches(items, "j");
    expect(results.length).to.equal(3);
  });
});
