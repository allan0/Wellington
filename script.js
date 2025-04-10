document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;

    // --- Element References (Common) ---
    const logo = document.getElementById('header-logo');
    const bodyElement = document.body;
    const userProfileElement = document.getElementById('user-profile');
    const userNameDisplay = document.getElementById('user-name-display');
    const wellyPointsDisplay = document.getElementById('welly-points');
    const userAvatarContainer = document.getElementById('user-avatar');
    const profileModalElement = document.getElementById('userProfileModal');
    const modalUserAvatar = document.getElementById('modal-user-avatar');
    const modalUserName = document.getElementById('modal-user-name');
    const modalWellyPoints = document.getElementById('modal-welly-points');
    const profileRankDisplay = document.getElementById('profile-rank-display');
    const leaderboardTableBody = document.getElementById('profile-leaderboard-body');
    const leaderboardLoading = document.getElementById('leaderboard-loading');
    const leaderboardEmpty = document.getElementById('leaderboard-empty');
    const deleteProgressBtn = document.getElementById('delete-progress-btn');
    const resetFeedbackArea = document.getElementById('reset-feedback');

    // --- State Variables (Consistent Keys) ---
    let currentUser = null;
    let totalWellyPoints = 0;
    let isFullscreenActive = false; // Track fullscreen state
    const POINTS_KEY = 'totalWellyPoints';
    const HACKATHON_TASKS_KEY = 'hackathonDay1TaskStatus_CS';
    const QUEST_PROGRESS_KEY = 'questProgress_CS';
    const LEADERBOARD_KEY = 'leaderboardData_CS';

    // --- Initialize Telegram Mini App & Profile (Shared) ---
    function initializeTelegramApp(isHomePage = false) {
        try {
            if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
                tg.ready();
                // tg.expand(); // Expand is usually less relevant if going fullscreen

                // --- Fullscreen Request ---
                if (tg.isVersionAtLeast('6.9') && !isFullscreenActive) { // Check version support
                    tg.requestFullscreen(true); // Request persistent fullscreen
                    isFullscreenActive = true; // Assume success for now
                    console.log("Requested Fullscreen Mode.");
                     // Optionally adjust body padding if fullscreen changes layout significantly
                     // document.body.style.paddingTop = '15px'; // Example: Reduce top padding
                } else {
                    tg.expand(); // Fallback to expand if fullscreen not supported/needed
                    console.log("Expanded (Fullscreen not requested or supported).");
                }


                // --- Back Button ---
                 if (isHomePage) {
                     tg.BackButton.hide();
                 } else {
                     tg.BackButton.show();
                     tg.onEvent('backButtonClicked', handleBackButton);
                 }


                currentUser = tg.initDataUnsafe.user;
                console.log("User Initialized:", currentUser);
                updateUserProfileDisplayHeader();

                loadWellyPoints().then(loadedPoints => {
                    console.log(`Initial points loaded: ${loadedPoints}`);
                    updateLeaderboardWithCurrentUser(loadedPoints);
                }).catch(error => {
                    console.error("Error during initial points load:", error);
                    updateWellyPointsDisplayUI(0);
                });

                console.log("Telegram Mini App Initialized.");

            } else {
                console.warn("Not running in Telegram context or user data unavailable.");
                displayGuestProfile();
            }
        } catch (error) {
            console.error("Error during Telegram App Initialization:", error);
            displayGuestProfile();
        }
    }

    // --- Back Button Handler (Shared) ---
    function handleBackButton() {
         // Exit fullscreen first if active
         if (isFullscreenActive && tg.isVersionAtLeast('6.9')) {
             tg.exitFullscreen();
             isFullscreenActive = false; // Assume exit success
             console.log("Exited Fullscreen via Back Button.");
             // Restore padding if changed
             // document.body.style.paddingTop = '65px';
         }

         // Standard back navigation
         if (window.history.length > 1) {
             window.history.back();
         } else if (tg && tg.close) {
             tg.close();
         } else {
             // Fallback if no history and cannot close (e.g., direct link)
             window.location.href = 'index.html';
         }
    }


    // --- Fullscreen Helper Functions (Optional) ---
    // function requestAppFullscreen() {
    //     if (tg && tg.isVersionAtLeast('6.9') && !isFullscreenActive) {
    //         tg.requestFullscreen(true);
    //         isFullscreenActive = true;
    //         console.log("Requested Fullscreen Mode.");
    //         // Adjust styles if needed
    //     }
    // }
    // function exitAppFullscreen() {
    //     if (tg && tg.isVersionAtLeast('6.9') && isFullscreenActive) {
    //         tg.exitFullscreen();
    //         isFullscreenActive = false;
    //         console.log("Exited Fullscreen Mode.");
    //         // Restore styles if needed
    //     }
    // }

    // --- Guest Profile Display (Shared) ---
    function displayGuestProfile() {
        if(userProfileElement) { userProfileElement.style.display = 'none'; userProfileElement.removeAttribute('data-bs-toggle'); userProfileElement.removeAttribute('data-bs-target'); userProfileElement.style.cursor = 'default'; }
        if(userNameDisplay) userNameDisplay.textContent = 'Guest';
        if(userAvatarContainer) userAvatarContainer.innerHTML = '👤';
        if(wellyPointsDisplay) wellyPointsDisplay.textContent = '0';
        if (deleteProgressBtn) deleteProgressBtn.disabled = true;
    }

    // --- Update Header Profile Display (Shared) ---
    function updateUserProfileDisplayHeader() {
        if (!currentUser) return;
        if (userNameDisplay) userNameDisplay.textContent = currentUser.first_name || 'Player';
        if (userAvatarContainer) {
            userAvatarContainer.innerHTML = '';
            if (currentUser.photo_url) {
                const img = document.createElement('img');
                img.src = currentUser.photo_url;
                img.alt = `${currentUser.first_name || 'User'}'s profile picture`;
                userAvatarContainer.appendChild(img);
            } else { userAvatarContainer.textContent = '🎓'; }
        }
    }

    // --- Update Points UI (Shared) ---
    function updateWellyPointsDisplayUI(points) {
        totalWellyPoints = points;
        if (wellyPointsDisplay) { wellyPointsDisplay.textContent = points; }
        // Update modal only if it exists and is shown
        if (profileModalElement && profileModalElement.classList.contains('show') && modalWellyPoints) {
             modalWellyPoints.textContent = points;
        }
    }

    // --- Welly Points Management (Shared) ---
    function loadWellyPoints() {
        return new Promise((resolve) => {
            totalWellyPoints = 0; // Reset before load
            if (tg && tg.CloudStorage) {
                tg.CloudStorage.getItem(POINTS_KEY, (error, value) => {
                    let loadedPoints = 0;
                    if (error) { console.error(`CS Error loading ${POINTS_KEY}:`, error); }
                    else if (value) { loadedPoints = parseInt(value, 10) || 0; console.log(`Loaded ${POINTS_KEY} from CS:`, loadedPoints); }
                    else { console.log(`${POINTS_KEY} not found in CS, defaulting to 0.`); }
                    updateWellyPointsDisplayUI(loadedPoints);
                    resolve(loadedPoints);
                });
            } else {
                console.warn("CloudStorage not available. Points display 0.");
                updateWellyPointsDisplayUI(0);
                resolve(0);
            }
        });
    }

    function saveWellyPoints() { // Renamed from original to avoid conflict if copy-pasting old code
        console.log("Attempting to save WP:", totalWellyPoints);
        return new Promise((resolve, reject) => {
            if (tg && tg.CloudStorage) {
                tg.CloudStorage.setItem(POINTS_KEY, totalWellyPoints.toString(), (error, success) => {
                    if (error) { console.error(`CS Error saving ${POINTS_KEY}:`, error); reject(new Error(`CloudStorage Error: ${error}`)); }
                    else if (success) { console.log(`Saved ${POINTS_KEY} to CS:`, totalWellyPoints); updateWellyPointsDisplayUI(totalWellyPoints); updateLeaderboardWithCurrentUser(totalWellyPoints); resolve(true); }
                    else { console.warn(`CS save call for ${POINTS_KEY} failed silently.`); reject(new Error("CloudStorage save failed silently.")); }
                });
            } else { console.warn("CloudStorage not available. Points not saved."); reject(new Error("CloudStorage not available.")); }
        });
    }

    // --- Logo Scroll Logic (Simplified if always fixed) ---
    function setupLogoScroll() {
        if (logo) {
            // Logo is always fixed via CSS now, just add click listener
            logo.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        } else { console.warn("Header logo element not found."); }
    }

    // --- Profile Modal Logic (Shared) ---
    if (profileModalElement) {
        profileModalElement.addEventListener('show.bs.modal', async function () {
            if (!currentUser) { console.error("Cannot open profile modal: User not initialized."); const modalInstance = bootstrap.Modal.getInstance(profileModalElement); if (modalInstance) modalInstance.hide(); tg.showAlert("Could not load profile data."); return; }
            console.log("Modal opening. Current User:", currentUser);
            if (modalUserName) modalUserName.textContent = currentUser.first_name || 'Player';
            if (modalUserAvatar) { modalUserAvatar.innerHTML = ''; if (currentUser.photo_url) { const img = document.createElement('img'); img.src = currentUser.photo_url; img.alt = `Profile picture`; modalUserAvatar.appendChild(img); } else { modalUserAvatar.textContent = '🎓'; } }
            if(resetFeedbackArea) resetFeedbackArea.textContent = ''; if(deleteProgressBtn) deleteProgressBtn.disabled = false;
            try {
                const currentPoints = await loadWellyPoints();
                console.log("Points re-loaded for modal:", currentPoints);
                if (modalWellyPoints) modalWellyPoints.textContent = currentPoints;
                await fetchAndDisplayLeaderboard(currentPoints);
            } catch (error) {
                console.error("Error loading points/leaderboard for modal:", error);
                if (modalWellyPoints) modalWellyPoints.textContent = 'Error'; if (profileRankDisplay) profileRankDisplay.textContent = 'Rank: Error'; if (leaderboardTableBody) leaderboardTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error loading data.</td></tr>'; if (leaderboardLoading) leaderboardLoading.style.display = 'none'; if (leaderboardEmpty) leaderboardEmpty.style.display = 'none';
            }
        });

        if (deleteProgressBtn) {
            deleteProgressBtn.addEventListener('click', function() {
                if(resetFeedbackArea) resetFeedbackArea.textContent = '';
                if (!tg || !tg.showConfirm) { if(resetFeedbackArea) { resetFeedbackArea.textContent = 'Action only available in Telegram.'; resetFeedbackArea.className = 'small feedback-error'; } else { alert("This action is only available within the Telegram app."); } return; }
                tg.showConfirm("Reset ALL progress (Points, Tasks, Quests)?\nThis cannot be undone.", async (confirmed) => {
                    if (confirmed) {
                        console.log("User confirmed progress reset."); deleteProgressBtn.disabled = true; if(resetFeedbackArea) { resetFeedbackArea.textContent = 'Resetting...'; resetFeedbackArea.className = 'small text-muted'; }
                        try {
                            // Use global totalWellyPoints and save function
                            totalWellyPoints = 0;
                            await saveWellyPoints(); // Save the reset points
                            console.log("Points reset to 0.");

                            const keysToRemove = [HACKATHON_TASKS_KEY, QUEST_PROGRESS_KEY, LEADERBOARD_KEY];
                            let deletePromises = [];
                            if (tg.CloudStorage) {
                                keysToRemove.forEach(key => { deletePromises.push(new Promise((resolve) => { tg.CloudStorage.deleteItem(key, (error, success) => { if (error) { console.error(`CS Error deleting ${key}:`, error); resolve({ status: 'rejected', key: key, error: error }); } else { console.log(`${key} deleted from CS: ${success}`); resolve({ status: 'fulfilled', key: key, success: success }); } }); })); });
                                const results = await Promise.allSettled(deletePromises); console.log("Deletion results:", results);
                                const failedDeletions = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)); if (failedDeletions.length > 0) { console.warn("Some keys might not have been deleted:", failedDeletions); }
                            } else { console.warn("CloudStorage not available. Cannot delete server-side progress."); }

                            if (modalWellyPoints) modalWellyPoints.textContent = '0';
                            if (profileRankDisplay) profileRankDisplay.textContent = 'Rank: N/A (Reset)';
                            if (leaderboardTableBody) leaderboardTableBody.innerHTML = '';
                            if (leaderboardEmpty) { leaderboardEmpty.textContent = 'Leaderboard reset.'; leaderboardEmpty.style.display = 'block'; }
                            if (leaderboardLoading) leaderboardLoading.style.display = 'none';

                            if(resetFeedbackArea) { resetFeedbackArea.textContent = 'Progress Reset Successfully!'; resetFeedbackArea.className = 'small feedback-success'; }
                            tg.showAlert("Your progress has been reset successfully.");
                            // Optionally re-enable button after timeout or leave disabled
                            // setTimeout(() => { deleteProgressBtn.disabled = false; }, 1500);

                        } catch (error) {
                            console.error("Error during progress reset:", error);
                            if(resetFeedbackArea) { resetFeedbackArea.textContent = `Reset failed: ${error.message || 'Unknown error'}`; resetFeedbackArea.className = 'small feedback-error'; }
                            tg.showAlert(`An error occurred: ${error.message || error}`);
                            deleteProgressBtn.disabled = false;
                        }
                    } else {
                        console.log("User cancelled progress reset.");
                        if(resetFeedbackArea) { resetFeedbackArea.textContent = 'Reset cancelled.'; resetFeedbackArea.className = 'small text-muted'; }
                    }
                });
            });
        }
    } else { console.error("Profile modal element not found."); }

    // --- Leaderboard Simulation Logic (Shared) ---
    async function getLeaderboardData() {
        return new Promise((resolve) => { if (tg && tg.CloudStorage) { tg.CloudStorage.getItem(LEADERBOARD_KEY, (error, value) => { let data = []; if (error) { console.error(`CS Error loading ${LEADERBOARD_KEY}:`, error); } else if (value) { try { data = JSON.parse(value); if (!Array.isArray(data)) data = []; console.log(`Loaded ${LEADERBOARD_KEY} from CS:`, data.length, "entries"); } catch (e) { console.error(`Error parsing ${LEADERBOARD_KEY} from CS:`, e); data = []; } } else { console.log(`${LEADERBOARD_KEY} not found in CS. Initializing.`); } if (currentUser) { const userExists = data.some(entry => entry.userId === currentUser.id); if (!userExists) { data.push({ userId: currentUser.id, firstName: currentUser.first_name || 'Player', points: totalWellyPoints }); } } resolve(data); }); } else { console.warn("CloudStorage not available for leaderboard."); resolve(currentUser ? [{ userId: currentUser.id, firstName: currentUser.first_name || 'Player', points: totalWellyPoints }] : []); } });
    }
    async function saveLeaderboardData(data) {
        if (!Array.isArray(data)) return; if (tg && tg.CloudStorage) { tg.CloudStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data), (error, success) => { if (error) console.error(`CS Error saving ${LEADERBOARD_KEY}:`, error); else if (success) console.log(`Saved ${LEADERBOARD_KEY} to CS:`, data.length, "entries"); else console.warn(`CS save call for ${LEADERBOARD_KEY} failed silently.`); }); } else console.warn("CloudStorage not available. Leaderboard not saved.");
    }
    async function updateLeaderboardWithCurrentUser(currentPoints) {
        if (!currentUser) return; try { let leaderboard = await getLeaderboardData(); const userIndex = leaderboard.findIndex(entry => entry.userId === currentUser.id); let changed = false; const userName = currentUser.first_name || 'Player'; if (userIndex > -1) { if (leaderboard[userIndex].points !== currentPoints || leaderboard[userIndex].firstName !== userName) { leaderboard[userIndex].points = currentPoints; leaderboard[userIndex].firstName = userName; changed = true; } } else { leaderboard.push({ userId: currentUser.id, firstName: userName, points: currentPoints }); changed = true; } if (changed) { leaderboard.sort((a, b) => b.points - a.points); await saveLeaderboardData(leaderboard); } else { console.log("Leaderboard already up-to-date for current user."); } } catch (error) { console.error("Failed to update leaderboard with current user:", error); }
    }
    async function fetchAndDisplayLeaderboard(currentPoints) {
        if (!leaderboardLoading || !leaderboardTableBody || !profileRankDisplay || !leaderboardEmpty || !currentUser) return;
        leaderboardLoading.style.display = 'block'; leaderboardTableBody.innerHTML = ''; leaderboardEmpty.style.display = 'none'; profileRankDisplay.textContent = 'Rank: Calculating...';
        try {
            let leaderboard = await getLeaderboardData();
            const userIndex = leaderboard.findIndex(entry => entry.userId === currentUser.id);
            if (userIndex > -1) {
                 if (leaderboard[userIndex].points !== currentPoints) { leaderboard[userIndex].points = currentPoints; }
                 if (leaderboard[userIndex].firstName !== (currentUser.first_name || 'Player')) { leaderboard[userIndex].firstName = currentUser.first_name || 'Player';}
            } else { leaderboard.push({ userId: currentUser.id, firstName: currentUser.first_name || 'Player', points: currentPoints }); }
            leaderboard.sort((a, b) => b.points - a.points);

            if (leaderboard.length === 0) {
                profileRankDisplay.textContent = 'Rank: N/A'; leaderboardEmpty.textContent = 'Leaderboard is empty.'; leaderboardEmpty.style.display = 'block';
            } else {
                const userRank = leaderboard.findIndex(entry => entry.userId === currentUser.id) + 1; const totalPlayers = leaderboard.length;
                profileRankDisplay.textContent = `Your Rank: #${userRank} of ${totalPlayers}`;
                const topN = 5;
                leaderboard.slice(0, topN).forEach((entry, index) => {
                    const rank = index + 1; const row = leaderboardTableBody.insertRow();
                    row.innerHTML = `<td class="text-center"><span class="rank-badge">${rank}</span></td><td>${entry.firstName || 'Player'} ${entry.userId === currentUser.id ? '<small class="text-muted">(You)</small>' : ''}</td><td class="points-cell">${entry.points}</td>`;
                    if (entry.userId === currentUser.id) { row.classList.add('table-info'); }
                });
            }
            leaderboardLoading.style.display = 'none';
        } catch (error) {
            console.error("Error fetching/displaying leaderboard:", error);
            profileRankDisplay.textContent = 'Rank: Error'; leaderboardEmpty.textContent = 'Error loading leaderboard.'; leaderboardEmpty.style.display = 'block'; leaderboardLoading.style.display = 'none';
        }
    }

    // --- Make functions globally accessible if needed by page-specific inline scripts ---
    // Or preferably, page-specific scripts should wrap their logic in functions
    // and call shared functions directly. Exposing globally is less ideal.
    window.wellyShared = {
        tg: tg,
        initializeTelegramApp: initializeTelegramApp,
        setupLogoScroll: setupLogoScroll,
        loadWellyPoints: loadWellyPoints,
        saveWellyPoints: saveWellyPoints, // Make sure page scripts use this name
        updateWellyPointsDisplayUI: updateWellyPointsDisplayUI,
        currentUser: () => currentUser // Accessor function
        // Add other shared functions if page-specific scripts need them
    };

    // --- Initial Setup Calls ---
    // Determine if it's the home page to configure back button
    const isHomePage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');
    initializeTelegramApp(isHomePage);
    setupLogoScroll();

}); // End DOMContentLoaded
