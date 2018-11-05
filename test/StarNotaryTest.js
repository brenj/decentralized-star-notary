/* eslint no-undef:0 */
/* eslint func-names:0 */

const StarNotary = artifacts.require('StarNotary');
const REVERT_ERROR_MSG = 'VM Exception while processing transaction: revert';

contract('StarNotary', (accounts) => {
  beforeEach(async function () {
    this.contract = await StarNotary.new({ from: accounts[0] });
  });

  describe('can create a star', () => {
    it('can create a star and get its details', async function () {
      await this.contract.createStar(
        'awesome star!', 'dec_121.874', 'mag_245.978', 'ra_032.155',
        'awesome star story', 1, { from: accounts[0] });
      assert.deepEqual(
        await this.contract.tokenIdToStarInfo(1),
        [
          'awesome star!', 'dec_121.874', 'mag_245.978',
          'ra_032.155', 'awesome star story',
        ]);
    });
    it('can create two stars with different coordinates', async function () {
      await this.contract.createStar(
        'awesome star #1!', 'dec_121.874', 'mag_245.978', 'ra_032.155',
        'awesome star story #1', 1, { from: accounts[0] });
      assert.deepEqual(
        await this.contract.tokenIdToStarInfo(1),
        [
          'awesome star #1!', 'dec_121.874', 'mag_245.978',
          'ra_032.155', 'awesome star story #1',
        ]);

      await this.contract.createStar(
        'awesome star #2!', 'dec_121.875', 'mag_245.979', 'ra_032.156',
        'awesome star story #2', 2, { from: accounts[1] });
      assert.deepEqual(
        await this.contract.tokenIdToStarInfo(2),
        [
          'awesome star #2!', 'dec_121.875', 'mag_245.979',
          'ra_032.156', 'awesome star story #2',
        ]);
    });
    it('can\'t create two stars with same coordinates', async function () {
      await this.contract.createStar(
        'awesome star #1!', 'dec_121.874', 'mag_245.978', 'ra_032.155',
        'awesome star story #1', 1, { from: accounts[0] });

      let errorThrown;

      try {
        await this.contract.createStar(
          'awesome star #2!', 'dec_121.874', 'mag_245.978', 'ra_032.155',
          'awesome star story #2', 2, { from: accounts[1] });
      } catch (error) {
        errorThrown = error;
      }

      assert.notEqual(errorThrown, undefined, 'Error should be thrown');
      assert.isAbove(
        errorThrown.message.search(REVERT_ERROR_MSG),
        -1, `Error: ${REVERT_ERROR_MSG}`);
    });
  });

  describe('buying and selling stars', () => {
    const user1 = accounts[1];
    const user2 = accounts[2];

    const starId = 1;
    const starPrice = web3.toWei(0.01, 'ether');

    beforeEach(async function () {
      await this.contract.createStar('awesome star!', starId, { from: user1 });
    });

    it('user1 can put up their star for sale', async function () {
      assert.equal(await this.contract.ownerOf(starId), user1);
      await this.contract.putStarUpForSale(starId, starPrice, { from: user1 });

      assert.equal(await this.contract.starsForSale(starId), starPrice);
    });

    describe('user2 can buy a star that was put up for sale', () => {
      beforeEach(async function () {
        await this.contract.putStarUpForSale(starId, starPrice, { from: user1 });
      });

      it('user2 is the owner of the star after they buy it', async function () {
        await this.contract.buyStar(starId, { from: user2, value: starPrice, gasPrice: 0 });
        assert.equal(await this.contract.ownerOf(starId), user2);
      });

      it('user2 ether balance changed correctly', async function () {
        const overpaidAmount = web3.toWei(0.05, 'ether');
        const balanceBeforeTransaction = web3.eth.getBalance(user2);
        await this.contract.buyStar(starId, { from: user2, value: overpaidAmount, gasPrice: 0 });
        const balanceAfterTransaction = web3.eth.getBalance(user2);

        assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice);
      });
    });
  });
});
