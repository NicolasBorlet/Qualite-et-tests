function canRenewSubscription(subscription, currentDate) {
  return subscription.status === 'active' &&
         subscription.endDate <= currentDate &&
         !subscription.hasBeenRenewed &&
         !subscription.unpaidDebt &&
         !subscription.isTrial;
}

module.exports = { canRenewSubscription };
