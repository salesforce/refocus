/**
 * tests/view/focus/lensUtils.js
 */
import l from '../../../view/focusTree/lensUtils-tree';
import { expect } from 'chai';
const ONE = 1;

describe('lensUtils', () => {
  it('nameAscending', () => {
    expect(l.nameAscending({ name: 'abc' }, { name: 'xyz' })).to.equal(-ONE);
    expect(l.nameAscending({ name: 'ABC' }, { name: 'xyz' })).to.equal(-ONE);
    expect(l.nameAscending({ name: 'xyz' }, { name: 'abc' })).to.equal(ONE);
    expect(l.nameAscending({ name: 'XYZ' }, { name: 'abc' })).to.equal(ONE);
    expect(l.nameAscending({ name: 'mno' }, { name: 'mno' })).to.equal(0);
    expect(l.nameAscending({ name: 'mno' }, { name: 'MNO' })).to.equal(0);
  });

  it('nodeChildren', () => {
    const n = {
      foo: [
        'g',
        'h',
        'i',
      ],
      children: [
        { name: 'a' },
        { name: 'b' },
        { name: 'c' },
      ],
      samples: {
        d: { name: 'd' },
        e: { name: 'e' },
        f: { name: 'f' },
      },
    };
    const expectedLength = n.children.length + Object.keys(n.samples).length;
    const nc = l.nodeChildren(n);
    expect(nc.length).to.equal(expectedLength);
  });

  it('getParentAbsolutePath', () => {
    expect(l.getParentAbsolutePath('a.b.c.d.e.f.g')).to.equal('a.b.c.d.e.f');
    expect(l.getParentAbsolutePath('a')).to.equal('');
    expect(l.getParentAbsolutePath('a.b.c|def')).to.equal('a.b.c');
    expect(l.getParentAbsolutePath('a|def')).to.equal('a');
  });

  it('removeOkNodesAndSetStatus');
});
