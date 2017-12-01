const expect = require('chai').expect;

function getMatches(arr, value) {
    const matches = [];
    binarySearch(arr, value, matches);
    return matches;
}

function binarySearch(items, value, matches) {
    let startIndex = 0;
    let stopIndex = items.length - 1;
    let middle = Math.floor((stopIndex + startIndex) / 2);

    while (items[middle] != value && startIndex < stopIndex) {

        //adjust search area
        if (value < items[middle]) {
            stopIndex = middle - 1;
        } else if (value > items[middle]) {
            startIndex = middle + 1;
        }

        //recalculate middle
        middle = Math.floor((stopIndex + startIndex) / 2);
    }

    //make sure it's the right value
    if (items[middle] != value) {
        return -1
    } else {
        matches.push(items[middle]);
        return binarySearch(items.slice(0, middle), value, matches) && binarySearch(items.slice(middle + 1, items.length), value, matches)
    }
}

describe.only('binary search', () => {
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
