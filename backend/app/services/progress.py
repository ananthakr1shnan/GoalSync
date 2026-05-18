from datetime import date

def compute_progress(uom: str, target: float, actual: float, target_date: date = None, actual_date: date = None) -> float:
    if actual is None:
        return 0.0
    if uom in ('numeric_min', 'percent_min'):
        return min((actual / target) * 100, 100.0) if target else 0.0
    elif uom in ('numeric_max', 'percent_max'):
        return min((target / actual) * 100, 100.0) if actual else 0.0
    elif uom == 'timeline':
        if actual_date and target_date:
            if actual_date <= target_date:
                return 100.0
            delta = (actual_date - target_date).days
            return max(0.0, 100.0 - (delta * 5))
        return 0.0
    elif uom == 'zero':
        return 100.0 if actual == 0 else 0.0
    return 0.0
