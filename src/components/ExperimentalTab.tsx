export default function ExperimentalTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Experimental Features</h2>
      <div className="prose max-w-none text-sm text-foreground/90">
        <p>
          This area contains experimental settings and features which may change, be
          removed, or behave unexpectedly. Use with caution. Experimental options
          are not guaranteed to be stable and may be modified or deleted in future
          releases.
        </p>
        <p>
          If you rely on any functionality here consider backing up your data before
          enabling or changing settings. Feedback is welcome — please file issues or
          feature requests in the project repository.
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        No actions are required here — this section is informational. Experimental
        options should be used with care.
      </div>
    </div>
  );
}
