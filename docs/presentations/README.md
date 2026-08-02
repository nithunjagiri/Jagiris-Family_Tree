# Jagiri's Kutumbam — Overview Presentations

Professional overview deck covering all app modules (Web + Android).

## Files

| File | Format | Use |
|------|--------|-----|
| `Jagiris-Kutumbam-Overview.pptx` | PowerPoint | Present live, edit in PowerPoint / Google Slides |
| `Jagiris-Kutumbam-Overview.pdf` | PDF | Share, print, email |

## Slides (15)

1. Cover  
2. Agenda  
3. What Is Jagiri's Kutumbam?  
4. Platforms & Access  
5. Dashboard  
6. Family Members  
7. Family Tree  
8. Reports & Analytics  
9. Photo Gallery  
10. Events  
11. Places & Map  
12. Search · Contact · Account  
13. Admin Portal  
14. Technology Stack  
15. Summary & Thank You  

## Design

- **16:9** widescreen, Segoe UI typography
- Grid-aligned bullet rows with connector lines
- Numbered module badges (01–08) on feature slides
- Agenda as a 2-column card grid
- Light canvas background with white content cards

## Regenerate

After app changes, update slide content in `scripts/generate_presentation.py` (`SLIDES` list), then run:

```powershell
python scripts/generate_presentation.py
```

Requires: `python-pptx`, `reportlab` (`pip install python-pptx reportlab`).
