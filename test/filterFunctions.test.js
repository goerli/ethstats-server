global.angular = {}
const assert = require('assert')
require('../src/js/filterFunctions')

describe('filterfunctions', () => {
  describe('#peerClass()', () => {

    it('should return text-gray if not active', () => {

      const pc = angular.peerClass(null, false)
      assert.equal(pc, 'text-gray')
    })

    it('should return text-gray if active', () => {

      const pc = angular.peerClass(null, true)
      assert.equal(pc, 'text-danger')
    })

  })
})