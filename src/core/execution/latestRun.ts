export class LatestRun {
  private current = 0;

  begin(): number {
    this.current += 1;
    return this.current;
  }

  invalidate(): void {
    this.current += 1;
  }

  isCurrent(id: number): boolean {
    return id === this.current;
  }
}
