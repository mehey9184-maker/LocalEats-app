# LocalEats pickup reminders and discovery alerts

Ready notifications open the verified pickup. The open app can surface one automatic reminder from an authoritative Ready event when the order is still Ready. Test 12 minutes before choosing a longer or shorter interval. Acknowledgement and snoozing are presentation actions. Collection still follows the server's order contract.

The separate **New shops within 4 km** preference starts off. The open app compares complete, approved catalogs at a stable location. Initial discovery establishes a baseline. The alert opens an exact shop and describes an addition to the nearby listing. A background alert for first publication needs a server-owned publication event so a reopened shop or an existing shop at a new location cannot be marketed as newly opened.

## Delivery and content still needed

- **Background Ready reminders.** Use a durable scheduled job keyed by the original Ready event and recipient. Verify order ownership, current Ready state, acknowledgement, device subscription and freshness at send time. Treat snooze as a new requested due time and cancel the automatic due time. Keep the Orders inbox available if delivery fails.
- **Newly published shops.** Record first approved publication once, keyed by shop. At delivery, recheck approval and the recipient's opted-in pickup area against verified shop coordinates. Include a distance of exactly 4 km. Skip missing or stale location, expired publication events and withdrawn shops. Let users select a pickup area rather than needing continuous location.
- **Followed shops.** Offer Follow after a confirmed pickup or on the storefront. Let users select Specials and New menu items. Publish an alert only for a current, visible item or a genuine offer with a valid price and expiry. Open the exact item. Keep expired or withdrawn offers out of send eligibility.
- **Weekly lunch picks.** Offer an optional short roundup and cap discovery and promotional push to one per customer per week across shops to start. Give the user quiet hours and mute controls. Show other eligible updates in an in-app What's new feed.

Test duplicate sends, collection during a scheduled reminder, stale permissions, shop withdrawal, the 4 km boundary, opt-out, account changes and denied notifications in an isolated sender. Track time to collect, reminder mutes, menu views and return pickups. Verify actual device delivery separately from provider acceptance.
