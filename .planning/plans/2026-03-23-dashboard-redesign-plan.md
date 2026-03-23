# Dashboard Redesign implementation Plan

> **For agentic workers:** REQUIRED sub-skill: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. steps use checkbox (`- [ ]`) syntax for tracking progress

**Goal:** Redesign dashboard with glassmorphism + floating orbs+ modern hover effects+ animations. Mobile menu support
 Dark mode consistency
  performance optimization
**architecture:** Hybrid Neo-Brutalist foundations with modern enhancements. Start with simple, preserving existing aesthetic, making minimal code changes that improve the overall design.
**Tech Stack:** Next.js 16, React 19, TypeScript, tailwind CSS v4. shadcn/ui

**Estimated Time:** 1-2 days
2-3 hours
**Commit strategy:** Atomic commits after verify progress. Phases:**
1. **Phase 1: Core UI - update globals.css and components** (repo-list, add-repo-dialog, sync-progress-modal)
2. **Phase 2: Other pages** - Apply new design to login, admin, repo detail
3. **Phase 3: Polish & test**
    - run final verification
    - commit changes
**Files:**
- modify: `src/app/globals.css`
  - add glassmorphism classes
  - add floating orb animations
  - update skeleton heights (proper loading states)
  - add stagger delays
  - use consistent animation timing
  - fix inconsistent styling
    - Replace inline font imports (use Google Fonts)
  - add mobile menu support
    - update confirmation dialogs
    - update sync progress UI
  - fix empty state
    - fix date formatting
    - remove unused code
    - clean up unused imports
    - fix type
    - fix skeleton heights
    - improve loading states
    - add mobile menu
    - update repo cards with glassmorphism + modern hover effects
    - improve repo cards layout
    - fix animations
    - clean up unused code
    - fix types
    - fix skeleton heights
    - add staggered animation delays
    - improve loading states with proper loading spinners
    - ensure responsive design (mobile menu)
    - add search/filter functionality
    - update stats with animated counters
    - improve sync progress UI
    - fix empty state
    - fix date formatting
    - remove unused code
    - clean up unused imports
    - optimize performance
    - preserve existing functionality
    - preserve existing tests
    - maintain Neo-brutalist aesthetic
    - add modern enhancements (glassmorphism, floating orbs)
    - Keep existing fonts (Sora + JetBrains Mono)
    - Use CSS variables for colors
    - use existing animations
    - improve performance with lazy loading and optimized components
    - ensure dark mode consistency
    - optimize performance
    - preserve existing functionality
    - preserve existing tests
    - maintain Neo-brutalist aesthetic
    - add modern enhancements (glassmorphism, floating orbs)
    - keep existing Neo-brutalist aesthetic with brutal shadows, sharp corners, dot/grid patterns
    - keep existing Neo-brutalist aesthetic
    - Add modern enhancements (glassmorphism, floating orbs)
    - keep code modular and avoid duplication
    - Update existing components where possible
    - use existing utility classes
    - preserve existing functionality
    - preserve existing tests
    - maintain Neo-brutalist aesthetic
    - add modern enhancements (glassmorphism, floating orbs)
    - keep existing fonts (Sora + JetBrains Mono)
    - use CSS variables for colors
    - use existing animations
    - improve performance
    - preserve existing functionality
    - preserve existing tests
    - maintain Neo-brutalist aesthetic
    - add modern enhancements (glassmorphism, floating orbs)
    - keep existing Neo-brutalist aesthetic
    - add modern enhancements (glassmorphism, floating orbs)
    - Clean up unused code
    - optimize performance
    - preserve existing functionality
    - preserve existing tests
    - maintain Neo-brutalist aesthetic
    - add modern enhancements (glassmorphism, floating orbs)
    - Keep existing fonts (Sora + JetBrains Mono)
    - use CSS variables for colors
    - use existing animations
    - improve performance
    - preserve existing functionality
    - preserve existing tests
    - maintain Neo-brutalist aesthetic
    - add modern enhancements (glassmorphism, floating orbs)
    - Keep existing Neo-brutalist aesthetic (brutal shadows, sharp corners, dot/grid patterns)
    - Modern enhancements: glassmorphism, floating orbs
    - Keep existing Neo-brutalist aesthetic (brutal shadows, sharp corners, dot/grid patterns)
    - Modern enhancements: glassmorphism, floating orbs
    - better loading states
    - improved hover effects
    - mobile menu support
    - improved empty state
    - fix date/time formatting
    - fix skeleton heights
    - use consistent animations
    - preserve existing functionality
    - fix types
    - fix skeleton heights
    - add staggered animation delays
    - update stat cards with glassmorphism
    - update repo cards with glassmorphism + modern hover effects
    - fix repo cards layout
    - fix animations
    - clean up unused code
    - clean up unused imports
    - fix type errors
    - fix skeleton heights
    - add mobile menu support
    - update confirmation dialogs
    - update sync progress UI
  - fix empty state
    - fix date formatting
    - remove unused code
    - clean up unused imports
    - optimize performance
    - preserve existing functionality
    - preserve existing tests
    - maintain Neo-brutalist aesthetic
    - add modern enhancements (glassmorphism, floating orbs)
    - Keep existing Neo-brutalist aesthetic (brutal shadows, sharp corners, dot/grid patterns)
    - Modern enhancements: glassmorphism, floating orbs
 gradient backgrounds
    - fix skeleton heights
    - fix repo card hover effects
            .card-brutal:hover {
              box-shadow: var(--shadow-brutal-lg);
            }
          }
          .input-brutal:hover {
            outline: none;
            border-color: var(--primary)
            transform: translate(2px, 4px)
          }
        }
      }
    }

    .input-brutal:hover {
      box-shadow: none;
    }
  }

  .input-brutal::placeholder {
    color: var(--muted-foreground)
    font-family: 'Sora', sans-serif
    font-size: 0.875rem
    padding: 0 0.75rem 1rem
    border: px solid var(--border)
  }

}

  .input-brutal:hover {
    outline: none
    border-color: var(--border)
  }
    }
  }
}
`

  return (
    <div className="flex items-center gap-4">
      <div className="p-2 border border-white/20 rounded-lg shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <GitBranch className="h-4 w-4" />
            <div className="min-w-0 flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-2 border border-white/30 backdrop-blur-lg rounded-lg shrink-0">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-center gap-4">
                                    <div className="flex flex-col items-center gap-4">
                                      <div className="p-2 border border-white/30 backdrop-blur-lg rounded-xl shrink-0">
                          <div className="flex flex-col items-center gap-4">
                            <div className="flex flex-col items-center gap-4">
                              <div className="p-2 border border-white/30 backdrop-blur-lg rounded-lg">
                            </div>
                          </div>
                        </ </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

 // Stats Grid
  {repos.length > 0 && (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {repos.map((repo) => {
        <div
          key={repo.id}
          className="stat-card group"
          <div className="flex items-center gap-4">
            <Icon className="h-5 w-5 text-white/70" />
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {display}
            </span>
            <AnimatedCounter value={stat.value} label={stat.label} />
          </div>
        ))}
      ))}
    </div>
  )}

  // Empty state
  {repos.length === 0 && (
    <div className="text-center flex flex-col sm:flex-row sm:items-end gap-4 mb-8 animate-fade-in">
                <p className="text-lg text-white/70 mb-6">
                  <p className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Track AI code across your codebase
                </p>
                <p className="text-sm text-white/60 mb-6 mb-2">Add your first repository to start tracking AI-generated code patterns.</p>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {repos.length === 0 ? (
        <div className="text-center">
          <p className="text-4xl font-bold text-white mb-8"> style={{ fontFamily: 'Outfit, sans-serif' }}>
            Track AI code patterns
                </p>
                <p className="text-xs text-white/60 uppercase tracking-wider text-[0px]">
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

  // Loading
  if (authLoading) {
    return <DashboardSkeleton />;
  }
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse text-xs text-white/70 animate-pulse">
      <p className="text-sm text-white/50">Search...</p>
    </div>
  </ });
    <div className="flex items-center justify-between mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {repos.map((repo) => {
          <div key={repo.id} className="group border border-white/15 bg-white/10 backdrop-blur-lg rounded-lg animate-fade-in" style={{ animationDelay: `${(150 * (index % 150) + 1}ms` }}>
 animationDelay: `${idx}00}`">
            <div className="animate-fade-in" style={{ animationDelay: `${getStaggerDelay(idx)}`" }}
          </div>
        ))}
      )}
    </div>
  }

  // Loading state
  return (
  // Stats
  if (repos.length > 0) {
    return (
  );
    <div className="text-center">
     <p className="text-sm text-white/50">No repositories yet</ />
     </1>
    <p className="text-sm text-white/50">Get started by adding a repository above</p>
        </ </div>

            <div className="flex flex-col items-end gap-4">
              <div className="flex flex-col items-center gap-3 mb:4">
                <Link href="/dashboard" className="text-purple-700 hover:bg-white/90 active:scale-[1.02] hover:scale-105 active:scale-110"
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
          </div>
        )}
      )}
    </div>
  );
}

  // Repo list
  {repos.length === 0 && (
    <div className="text-center flex flex-col sm:flex-row sm:items-end gap-4 mb:8 animate-fade-in" styles={{ animationDelay: `${getStaggerDelay(idx)}`" }}
          >
 .div>
          ))}
        ))}
      )
    </div>
  );
}