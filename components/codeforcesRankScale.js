const RANKS = [
  { ceiling: 1200, label: 'Newbie', color: '#808080' },
  { ceiling: 1400, label: 'Pupil', color: '#008000' },
  { ceiling: 1600, label: 'Specialist', color: '#03A89E' },
  { ceiling: 1900, label: 'Expert', color: '#0000FF' },
  { ceiling: 2100, label: 'Candidate Master', color: '#AA00AA' },
  { ceiling: 2300, label: 'Master', color: '#FF8C00' },
  { ceiling: 2400, label: 'International Master', color: '#FF8C00' },
  { ceiling: 2600, label: 'Grandmaster', color: '#FF0000' },
  { ceiling: 3000, label: 'International Grandmaster', color: '#FF0000' },
  { ceiling: Number.POSITIVE_INFINITY, label: 'Legendary Grandmaster', color: '#FF0000' },
];

export class CodeforcesRankScale {
  static forRating(rating) {
    if (!Number.isFinite(rating) || rating < 0) {
      return { label: 'Unrated', color: '#808080' };
    }
    const { label, color } = RANKS.find((rank) => rating < rank.ceiling);
    return { label, color };
  }
}
