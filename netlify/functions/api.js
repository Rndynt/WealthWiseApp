      createdAt: workspaces.createdAt,
      membershipRole: workspaceMembers.role
    const normalizeLimit = (limit) => limit == null || limit < 0 ? null : limit;
      const personalLimit = normalizeLimit(userSubResult.package.maxWorkspaces);
      const sharedLimit = normalizeLimit(userSubResult.package.maxSharedWorkspaces);
      const personalOwned = userWorkspaces.filter((workspace) => workspace.ownerId === userId && workspace.type === "personal").length;
      const sharedOwned = userWorkspaces.filter((workspace) => workspace.ownerId === userId && workspace.type !== "personal").length;
        personalOwned,
        personalLimit,
        sharedOwned,
        sharedLimit
      const personalOwned = userWorkspaces.filter((workspace) => workspace.ownerId === userId && workspace.type === "personal").length;
      const sharedOwned = userWorkspaces.filter((workspace) => workspace.ownerId === userId && workspace.type !== "personal").length;
        personalOwned,
        personalLimit: 1,
        sharedOwned,
        sharedLimit: 0
    if (limits.personalLimit === null) {
      return true;
    }
    return limits.personalOwned < limits.personalLimit;
