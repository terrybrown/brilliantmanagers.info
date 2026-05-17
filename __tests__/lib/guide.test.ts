import {
  GUIDE_SECTIONS,
  getPrevNextChapters,
} from '@/lib/guide'

describe('guide helpers', () => {
  it('GUIDE_SECTIONS lists all six sections in reading order', () => {
    expect(GUIDE_SECTIONS).toEqual([
      'self',
      'team',
      'strategy',
      'communications',
      'domain-expertise',
      'measurement',
    ])
  })

  it('getPrevNextChapters returns null prev for first chapter', () => {
    const { prev } = getPrevNextChapters(['self'])
    expect(prev).toBeNull()
  })

  it('getPrevNextChapters returns null next for last chapter', () => {
    const { next } = getPrevNextChapters(['measurement'])
    expect(next).toBeNull()
  })

  it('getPrevNextChapters returns both for middle chapter', () => {
    const { prev, next } = getPrevNextChapters(['team'])
    expect(prev?.slug).toEqual(['self'])
    expect(next?.slug).toEqual(['strategy'])
  })
})
