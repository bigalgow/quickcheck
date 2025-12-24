// src/pages/Dashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, userInfo } = useAuth();
  
  // Sample articles - later you can fetch these from your API
  const featuredArticles = [
    {
      id: 1,
      title: '5 Retirement Mistakes to Avoid',
      excerpt: 'Don\'t let these common errors derail your retirement plans...',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=200&fit=crop',
      url: 'https://retireplan.co.uk/articles/5-mistakes',
      category: 'Planning'
    },
    {
      id: 2,
      title: 'Understanding Your Pension Options',
      excerpt: 'A comprehensive guide to maximizing your pension benefits...',
      image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=200&fit=crop',
      url: 'https://retireplan.co.uk/articles/pension-options',
      category: 'Finance'
    },
    {
      id: 3,
      title: 'Lifestyle Planning: Where Will You Live?',
      excerpt: 'Exploring housing options for your ideal retirement lifestyle...',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=200&fit=crop',
      url: 'https://retireplan.co.uk/articles/housing-options',
      category: 'Lifestyle'
    },
  ];
  
  const quickActions = [
    {
      id: 'calculator',
      icon: '🧮',
      title: 'Lifestyle Calculator',
      description: 'Plan your ideal retirement',
      action: () => navigate('/lifestyle-calculator'),
      color: '#0ea5e9'
    },
    {
      id: 'profile',
      icon: '📊',
      title: 'My Plan',
      description: 'View your progress',
      action: () => navigate('/profile'),
      color: '#8b5cf6'
    },
  ];
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {isAuthenticated && userInfo?.email 
              ? `Welcome back${userInfo.name ? `, ${userInfo.name.split(' ')[0]}` : ''}!`
              : 'Welcome to RetirePlan'}
          </h1>
          <p style={styles.subtitle}>Your retirement planning hub</p>
        </div>
      </header>
      
      {/* Quick Actions */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionsGrid}>
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={action.action}
              style={{...styles.actionCard, borderLeft: `4px solid ${action.color}`}}
            >
              <div style={styles.actionIcon}>{action.icon}</div>
              <div style={styles.actionContent}>
                <h3 style={styles.actionTitle}>{action.title}</h3>
                <p style={styles.actionDescription}>{action.description}</p>
              </div>
              <div style={styles.actionArrow}>→</div>
            </button>
          ))}
        </div>
      </section>
      
      {/* Featured Articles */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>From Ascent Magazine</h2>
          <button 
            onClick={() => window.open('https://retireplan.co.uk/magazine', '_blank')}
            style={styles.viewAllButton}
          >
            View All ↗
          </button>
        </div>
        
        <div style={styles.articlesGrid}>
          {featuredArticles.map(article => (
            <article
              key={article.id}
              onClick={() => window.open(article.url, '_blank')}
              style={styles.articleCard}
            >
              <div 
                style={{
                  ...styles.articleImage,
                  backgroundImage: `url(${article.image})`
                }}
              >
                <span style={styles.articleCategory}>{article.category}</span>
              </div>
              <div style={styles.articleContent}>
                <h3 style={styles.articleTitle}>{article.title}</h3>
                <p style={styles.articleExcerpt}>{article.excerpt}</p>
                <div style={styles.articleFooter}>
                  <span style={styles.readMore}>Read more →</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      
      {/* Learn Section */}
      <section style={styles.section}>
        <div style={styles.learnCard}>
          <div style={styles.learnIcon}>🎓</div>
          <div style={styles.learnContent}>
            <h3 style={styles.learnTitle}>Want to Learn More?</h3>
            <p style={styles.learnDescription}>
              Explore our comprehensive guides on retirement planning, pensions, and lifestyle choices.
            </p>
          </div>
          <button
            onClick={() => window.open('https://retireplan.co.uk/learn', '_blank')}
            style={styles.learnButton}
          >
            Explore Guides ↗
          </button>
        </div>
      </section>
      
      {/* Bottom spacing for nav */}
      <div style={styles.bottomSpacer} />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    paddingBottom: '80px', // Space for bottom nav
  },
  header: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    padding: '40px 20px 30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '16px',
    opacity: 0.9,
  },
  section: {
    padding: '24px 20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '16px',
  },
  viewAllButton: {
    background: 'none',
    border: 'none',
    color: '#0ea5e9',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionCard: {
    background: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    textAlign: 'left',
  },
  actionIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  actionDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  actionArrow: {
    fontSize: '20px',
    color: '#cbd5e1',
  },
  articlesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  articleCard: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  articleImage: {
    height: '160px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '12px',
  },
  articleCategory: {
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#0ea5e9',
  },
  articleContent: {
    padding: '16px',
  },
  articleTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
  },
  articleExcerpt: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  articleFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readMore: {
    fontSize: '14px',
    color: '#0ea5e9',
    fontWeight: '600',
  },
  learnCard: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    borderRadius: '16px',
    padding: '24px',
    color: 'white',
  },
  learnIcon: {
    fontSize: '40px',
    marginBottom: '16px',
  },
  learnContent: {
    marginBottom: '20px',
  },
  learnTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  learnDescription: {
    fontSize: '14px',
    opacity: 0.9,
    lineHeight: '1.5',
  },
  learnButton: {
    background: 'white',
    color: '#8b5cf6',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  bottomSpacer: {
    height: '20px',
  },
};
