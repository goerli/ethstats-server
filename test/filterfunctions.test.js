const assert = require('assert')
const { peerClass } = require('../src/js/filterfunctions')

describe('filterfunctions', () => {
  describe('#peerClass()', () => {

    it('should return text-gray if not active', () => {

      const pc = peerClass(null, false)
      assert.equal(pc, 'text-gray')
    })

    it('should return text-gray if active', () => {

      const pc = peerClass(null, true)
      assert.equal(pc, 'text-danger')
    })

  })
})