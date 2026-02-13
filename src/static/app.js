document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  // Helper to update a single activity card in-place
  function updateActivityCard(activityName, details) {
    const cards = activitiesList.querySelectorAll('.activity-card');
    for (const card of cards) {
      // match by dataset or fallback to h4 text
      const name = card.dataset.activity || (card.querySelector('h4') && card.querySelector('h4').textContent);
      if (name === activityName) {
        const spotsLeft = details.max_participants - details.participants.length;
        const availabilityEl = card.querySelector('.availability');
        if (availabilityEl) {
          availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
        }
        const participantsContent = card.querySelector('.participants-content');
        if (participantsContent) {
          const participantsHtml = details.participants && details.participants.length
            ? `<ul class="participants-list">${details.participants.map(p => `<li class="participant"><span class="participant-email">${p}</span><button class="participant-delete" data-activity="${activityName}" data-email="${p}" title="Remove participant">×</button></li>`).join("")}</ul>`
            : `<p class="info">No participants yet</p>`;
          participantsContent.innerHTML = participantsHtml;

          // Re-attach delete handlers for the updated list
          const deleteButtons = participantsContent.querySelectorAll('.participant-delete');
          deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const email = btn.dataset.email;
              const activityName = btn.dataset.activity;
              if (!confirm(`Remove ${email} from ${activityName}?`)) return;
              try {
                const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                const resJson = await resp.json();
                if (resp.ok) {
                  messageDiv.textContent = resJson.message;
                  messageDiv.classList.remove("hidden", "error", "info", "success");
                  messageDiv.classList.add("message", "success");
                  fetchActivities();
                } else {
                  messageDiv.textContent = resJson.detail || "Failed to remove participant";
                  messageDiv.classList.remove("hidden", "error", "info", "success");
                  messageDiv.classList.add("message", "error");
                }
                messageDiv.classList.remove("hidden");
                setTimeout(() => { messageDiv.classList.add("hidden"); }, 5000);
              } catch (err) {
                messageDiv.textContent = "Failed to remove participant. Please try again.";
                messageDiv.classList.remove("hidden", "error", "info", "success");
                messageDiv.classList.add("message", "error");
                console.error('Error removing participant:', err);
              }
            });
          });
        }
        break;
      }
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to default option to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        // Attach activity name for easy lookup when updating a single card
        activityCard.dataset.activity = name;

        const spotsLeft = details.max_participants - details.participants.length;

        // Render participants as a bulleted list (or show a friendly message when empty)
        const participantsHtml = details.participants && details.participants.length
          ? `<ul class="participants-list">${details.participants.map(p => `<li class="participant"><span class="participant-email">${p}</span><button class="participant-delete" data-activity="${name}" data-email="${p}" title="Remove participant">×</button></li>`).join("")}</ul>`
          : `<p class="info">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            <div class="participants-content">${participantsHtml}</div>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Attach delete handlers for participant remove buttons
        const deleteButtons = activityCard.querySelectorAll('.participant-delete');
        deleteButtons.forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const email = btn.dataset.email;
            const activityName = btn.dataset.activity;
            if (!confirm(`Remove ${email} from ${activityName}?`)) return;
            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const resJson = await resp.json();
              if (resp.ok) {
                messageDiv.textContent = resJson.message;
                messageDiv.classList.remove("hidden", "error", "info", "success");
                messageDiv.classList.add("message", "success");
                // Refresh activities to reflect removal
                fetchActivities();
              } else {
                messageDiv.textContent = resJson.detail || "Failed to remove participant";
                messageDiv.classList.remove("hidden", "error", "info", "success");
                messageDiv.classList.add("message", "error");
              }
              messageDiv.classList.remove("hidden");
              setTimeout(() => { messageDiv.classList.add("hidden"); }, 5000);
            } catch (err) {
              messageDiv.textContent = "Failed to remove participant. Please try again.";
              messageDiv.classList.remove("hidden", "error", "info", "success");
              messageDiv.classList.add("message", "error");
              console.error('Error removing participant:', err);
            }
          });
        });
      });

      
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // Ensure the base message class is present and apply success styling
        messageDiv.classList.remove("hidden", "error", "info", "success");
        messageDiv.classList.add("message", "success");
        signupForm.reset();
        // Update the single activity card if the server returned the updated activity,
        // otherwise fall back to refetching all activities.
        if (result.activity) {
          updateActivityCard(activity, result.activity);
        } else {
          fetchActivities();
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.classList.remove("hidden", "error", "info", "success");
        messageDiv.classList.add("message", "error");
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.classList.remove("hidden", "error", "info", "success");
      messageDiv.classList.add("message", "error");
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
