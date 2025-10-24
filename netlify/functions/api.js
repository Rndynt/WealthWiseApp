    const ownedWorkspaces = userWorkspaces.filter((workspace) => workspace.ownerId === userId);
    const ownedPersonalWorkspaces = ownedWorkspaces.filter((workspace) => workspace.type !== "shared").length;
    const ownedSharedWorkspaces = ownedWorkspaces.filter((workspace) => workspace.type === "shared").length;
    const invitedSharedWorkspaces = userWorkspaces.filter((workspace) => workspace.type === "shared" && workspace.ownerId !== userId).length;
      const personalLimit = userSubResult.package.maxWorkspaces ?? null;
      const sharedLimit = userSubResult.package.canCreateSharedWorkspace ? userSubResult.package.maxSharedWorkspaces ?? null : 0;
      const personalRemaining = personalLimit === null ? null : Math.max(personalLimit - ownedPersonalWorkspaces, 0);
      const sharedRemaining = sharedLimit === null ? null : Math.max(sharedLimit - ownedSharedWorkspaces, 0);
        maxWorkspaces: personalLimit,
        maxSharedWorkspaces: sharedLimit,
        canCreateSharedWorkspace: userSubResult.package.canCreateSharedWorkspace,
        currentWorkspaces: ownedPersonalWorkspaces + ownedSharedWorkspaces,
        breakdown: {
          personal: {
            used: ownedPersonalWorkspaces,
            limit: personalLimit,
            remaining: personalRemaining
          },
          shared: {
            used: ownedSharedWorkspaces,
            limit: sharedLimit,
            remaining: sharedLimit === 0 ? 0 : sharedRemaining
          },
          sharedInvitations: {
            used: invitedSharedWorkspaces
          }
        }
    const personalLimit = 1;
    const sharedLimit = 0;
    const personalRemaining = personalLimit - ownedPersonalWorkspaces;
    return {
      maxWorkspaces: personalLimit,
      maxMembers: 1,
      maxSharedWorkspaces: sharedLimit,
      canCreateSharedWorkspace: false,
      currentWorkspaces: ownedPersonalWorkspaces,
      breakdown: {
        personal: {
          used: ownedPersonalWorkspaces,
          limit: personalLimit,
          remaining: Math.max(personalRemaining, 0)
        },
        shared: {
          used: ownedSharedWorkspaces,
          limit: sharedLimit,
          remaining: 0
        },
        sharedInvitations: {
          used: invitedSharedWorkspaces
        }
      }
    };
    const personalLimit = limits.breakdown.personal.limit;
    if (personalLimit === null) {
      return true;
    }
    return limits.breakdown.personal.used < personalLimit;
