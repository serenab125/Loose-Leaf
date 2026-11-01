import React, { useState, useEffect } from 'react';
import styles from './Profile.module.css';
import { supabase } from '../../supabaseClient';

export function Profile({ user, logout }) {
  const [view, setView] = useState('main');

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('Book lover, tea enthusiast, and collector of dog-eared paperbacks. Always chasing a new good read. 🍵📚');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('(555) 123-4567');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [readingReminders, setReadingReminders] = useState(true);
  const [newRecommendations, setNewRecommendations] = useState(true);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || 'Jane Reader');

      async function loadProfileData() {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, bio, phone')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          if (data.full_name) setFullName(data.full_name);
          if (data.bio) setBio(data.bio);
          if (data.phone) setPhone(data.phone);
        }
      }
      loadProfileData();
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullName,
            bio: bio,
            phone: phone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) throw error;

      setSaveMessage('Profile saved successfully!');
      setTimeout(() => {
        setSaveMessage('');
        setView('main');
      }, 1000);
    } catch (err) {
      console.error('Save profile error:', err);
      setSaveMessage('Error saving profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.profileContainer}>
      {view === 'main' && (
        <div className={styles.mainView}>
          <header className={styles.topHeader}>
            <h1 className={styles.profileTitle}>Profile</h1>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setView('settings')}
              aria-label="Settings"
            >
              ⚙️
            </button>
          </header>

          <div className={styles.userInfoCard}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarCircle}>👤</div>
              <button
                type="button"
                className={styles.editBadge}
                onClick={() => setView('edit')}
              >
                ✏️
              </button>
            </div>
            <h2 className={styles.userName}>{fullName || 'Jane Reader'}</h2>
            <p className={styles.userBio}>{bio}</p>
          </div>

          <section className={styles.shelfSection}>
            <div className={styles.pillTag}>
              <span>Top 4 Favorites</span> 🍃
            </div>
            <div className={`${styles.shelfCard} ${styles.favoritesBg}`}>
              <div className={styles.bookRow}>
                <img src="https://covers.openlibrary.org/b/id/12818862-L.jpg" alt="Life of Pi" className={styles.bookCover} />
                <img src="https://covers.openlibrary.org/b/id/10521270-L.jpg" alt="The Goldfinch" className={styles.bookCover} />
                <img src="https://covers.openlibrary.org/b/id/8381286-L.jpg" alt="Scythe" className={styles.bookCover} />
                <img src="https://covers.openlibrary.org/b/id/8225261-L.jpg" alt="The Catcher in the Rye" className={styles.bookCover} />
              </div>
            </div>
          </section>

          <section className={styles.shelfSection}>
            <div className={styles.pillTag}>
              <span>Current Reads</span> 🍃
            </div>
            <div className={`${styles.shelfCard} ${styles.currentReadsBg}`}>
              <div className={styles.bookRow}>
                <img src="https://covers.openlibrary.org/b/id/14589201-L.jpg" alt="Quicksilver" className={styles.bookCover} />
                <img src="https://covers.openlibrary.org/b/id/13254928-L.jpg" alt="The Hunger Games" className={styles.bookCover} />
              </div>
            </div>
          </section>
        </div>
      )}

      {view === 'edit' && (
        <div className={styles.subView}>
          <button type="button" className={styles.backBtn} onClick={() => setView('main')}>
            ← Edit Profile
          </button>

          <div className={styles.avatarWrapperCenter}>
            <div className={styles.avatarCircle}>👤</div>
            <div className={styles.editBadgeCenter}>✏️</div>
          </div>

          <form onSubmit={handleSaveProfile} className={styles.editForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>NAME</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>BIO</label>
              <textarea
                className={`${styles.fieldInput} ${styles.textArea}`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>EMAIL</label>
              <input
                type="email"
                className={styles.fieldInput}
                value={email}
                disabled
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>PHONE NUMBER</label>
              <div className={styles.phoneRow}>
                <select className={styles.countrySelect}>
                  <option>+1 (US)</option>
                </select>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {saveMessage && <p className={styles.saveFeedback}>{saveMessage}</p>}

            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {view === 'settings' && (
        <div className={styles.subView}>
          <button type="button" className={styles.backBtn} onClick={() => setView('main')}>
            ← Settings
          </button>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>PERSONAL INFO</p>
            <button type="button" className={styles.settingItem} onClick={() => setView('edit')}>
              <span>Name & Bio</span> <span>›</span>
            </button>
            <button type="button" className={styles.settingItem} onClick={() => setView('edit')}>
              <span>Email Address</span> <span>›</span>
            </button>
            <button type="button" className={styles.settingItem} onClick={() => setView('edit')}>
              <span>Phone Number</span> <span>›</span>
            </button>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>GOODREADS DATA</p>
            <button type="button" className={styles.settingItem}>
              <span>Import Goodreads Library</span> <span>›</span>
            </button>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>NOTIFICATIONS</p>
            <div className={styles.settingToggleItem}>
              <span>Reading Reminders</span>
              <input
                type="checkbox"
                className={styles.toggleSwitch}
                checked={readingReminders}
                onChange={(e) => setReadingReminders(e.target.checked)}
              />
            </div>
            <div className={styles.settingToggleItem}>
              <span>New Recommendations</span>
              <input
                type="checkbox"
                className={styles.toggleSwitch}
                checked={newRecommendations}
                onChange={(e) => setNewRecommendations(e.target.checked)}
              />
            </div>
          </div>

          <div className={styles.settingsGroup}>
            <p className={styles.sectionHeader}>SUPPORT</p>
            <button type="button" className={styles.settingItem}>
              <span>Help Center & Contact</span> <span>›</span>
            </button>
          </div>

          <button type="button" className={styles.signOutBtn} onClick={logout}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}