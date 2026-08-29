// ================================================================
// 🚀 TELEPORT FLASHBACK EVENT
// ================================================================

module.exports = async function runTeleport(page) {

  // ==============================================================
  // OPEN GUILD PAGE
  // CHECK WHETHER A FLASHBACK EVENT IS ALREADY ACTIVE
  // ==============================================================

  try {

    await page.goto(
      'https://v3.g.ladypopular.com/guild.php',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

  } catch (error) {

    console.log(`❌ Guild page failed to load: ${error.message}`);

    throw error;

  }


  const activeFlashbackEvents = await page.locator(
    '#header-events-container .header-event-banner[data-is_flashback="1"]'
  ).count();


  // --------------------------------------------------------------
  // CASE 1
  // A flashback event is already active.
  // --------------------------------------------------------------

  if (activeFlashbackEvents > 0) {

    console.log('🚀 Flashback event already active. Skipping.');

    return;

  }


  // --------------------------------------------------------------
  // CASE 2
  // No flashback event is active.
  // Continue to Teleport event request.
  // --------------------------------------------------------------


  // ==============================================================
  // GET TELEPORT FLASHBACK EVENTS
  // ==============================================================

  let eventsResponse;


  try {

    eventsResponse = await page.evaluate(async () => {

      const response = await fetch(
        'https://v3.g.ladypopular.com/ajax/events.php',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          },

          body: new URLSearchParams({
            'event_types[]': 'teleport',
            'ignore_won_rewards': 'false',
            type: 'loadMoreEvents',
            offset: '0',
            name: ''
          }),

          credentials: 'same-origin'
        }
      );

      return await response.json();

    });


    console.log(
      `🚀 Teleport events loaded. Server status=${eventsResponse?.status}`
    );


  } catch (error) {

    console.log(`❌ Teleport events request failed: ${error.message}`);

    throw error;

  }


  // --------------------------------------------------------------
  // Make sure the response has the structure we expect.
  // --------------------------------------------------------------

  if (!eventsResponse) {

    console.log('❌ Teleport events response was empty.');

    throw new Error(
      'Empty response received from events.php.'
    );

  }


  if (eventsResponse.status !== 1) {

    console.log(
      `❌ Teleport events request returned status=${eventsResponse.status}`
    );

    throw new Error(
      `Teleport flashback event request failed with status ${eventsResponse.status}.`
    );

  }


  // --------------------------------------------------------------
  // Get event list.
  // --------------------------------------------------------------

  const events = eventsResponse.search_events?.list;


  if (!Array.isArray(events)) {

    console.log('❌ Teleport event list missing or invalid.');

    throw new Error(
      'Unexpected events response structure: search_events.list is missing.'
    );

  }


  // ==============================================================
  // FILTER TELEPORT FLASHBACK EVENTS
  // ==============================================================

  const unlockedEvents = [];
  const lockedEvents = [];


  for (const event of events) {

    if (event.is_flashback !== true) {

      continue;

    }


    if (event.can_be_activated === true) {

      unlockedEvents.push({
        id: event.id,
        title: event.title
      });

    } else {

      lockedEvents.push({
        id: event.id,
        title: event.title,
        lockReason: event.lock_type_info
      });

    }

  }


  console.log(
    `🚀 Teleport flashbacks found: ${events.length} total | ${unlockedEvents.length} unlocked`
  );


  // --------------------------------------------------------------
  // If there are no unlocked events, we cannot activate anything.
  // --------------------------------------------------------------

  if (unlockedEvents.length === 0) {

    console.log('🚀 No unlocked Teleport flashback events. Skipping.');

    return;

  }


  // ==============================================================
  // RANDOMLY CHOOSE ONE UNLOCKED EVENT
  // ==============================================================

  const randomIndex = Math.floor(
    Math.random() * unlockedEvents.length
  );


  const selectedEvent = unlockedEvents[randomIndex];


  console.log(
    `🎯 Activating Teleport event: ${selectedEvent.title} (ID ${selectedEvent.id})`
  );


  // ==============================================================
  // ACTIVATE EVENT
  // ==============================================================

  let activationResponse;


  try {

    activationResponse = await page.evaluate(async (eventId) => {

      const response = await fetch(
        'https://v3.g.ladypopular.com/ajax/events.php',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          },

          body: new URLSearchParams({
            type: 'activateEvent',
            event_id: String(eventId)
          }),

          credentials: 'same-origin'
        }
      );

      return await response.json();

    }, selectedEvent.id);


  } catch (error) {

    console.log(`❌ Teleport event activation request failed: ${error.message}`);

    throw error;

  }


  if (activationResponse?.status === 1) {

    console.log(
      `✅ Teleport flashback activated: ${selectedEvent.title}`
    );

  } else {

    console.log(
      `❌ Teleport event activation failed. Status=${activationResponse?.status}`
    );

    throw new Error(
      `Failed to activate Teleport event "${selectedEvent.title}" (ID ${selectedEvent.id}). Server status: ${activationResponse?.status}`
    );

  }

};
