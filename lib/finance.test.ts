import {test} from 'node:test';
import assert from 'node:assert/strict';
import {payoutFactor,recommend,sampleProfile,simulate} from './finance';
test('threshold, target, accelerator and cap boundaries',()=>{const k=recommend('Sales Representative')[0];assert.equal(payoutFactor(69,k),0);assert.equal(payoutFactor(70,k),.7);assert.equal(payoutFactor(100,k),1);assert.equal(payoutFactor(120,k),1.3);assert.equal(payoutFactor(300,k),2)});
test('on-target portfolio pays budget with correct profit',()=>{const s=simulate(sampleProfile,recommend('Sales Representative'),100,65);assert.equal(s.payout,180000);assert.equal(s.revenue,6000000);assert.equal(s.netContribution,3720000)});
test('all capped payouts remain within exposure limit',()=>{const s=simulate(sampleProfile,recommend('Sales Representative'),1000,1000);assert.equal(s.payout,s.maxPayout)});
