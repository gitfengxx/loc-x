#pragma once
#import "TargetSettings.h"
#import <stdlib.h>

// A fresh 8–12 m offset from the original selection; never offset a prior result.
static inline NSDictionary *WLOCOffsetTarget(NSDictionary *base, double metres, double bearing) {
    if (!WLOCValidatedTarget(base) || !isfinite(metres) || metres < 8 || metres > 12 || !isfinite(bearing)) return nil;
    double lat=[base[@"latitude"] doubleValue]*M_PI/180, lon=[base[@"longitude"] doubleValue]*M_PI/180;
    double d=metres/6371008.8;
    double a=asin(fmax(-1,fmin(1,sin(lat)*cos(d)+cos(lat)*sin(d)*cos(bearing))));
    double b=lon+atan2(sin(bearing)*sin(d)*cos(lat),cos(d)-sin(lat)*sin(a));
    b=fmod(b+3*M_PI,2*M_PI)-M_PI;
    return WLOCValidatedTarget(@{@"latitude":@(a*180/M_PI),@"longitude":@(b*180/M_PI)});
}
static inline NSDictionary *WLOCRandomTarget(NSDictionary *base) {
    double u=(double)arc4random()/4294967296.0, v=(double)arc4random()/4294967296.0;
    return WLOCOffsetTarget(base,sqrt(64+80*u),2*M_PI*v);
}
static inline NSArray *WLOCReadFavorites(NSUserDefaults *store) {
    id raw=[store objectForKey:@"favoriteLocations"];
    NSMutableArray *result=[NSMutableArray array];
    if([raw isKindOfClass:NSArray.class]) for(id item in raw) {
        if(![item isKindOfClass:NSDictionary.class])continue;
        NSDictionary *target=WLOCValidatedTarget(item[@"target"]);
        NSString *name=[item[@"name"] isKindOfClass:NSString.class]?item[@"name"]:nil;
        NSString *identifier=[item[@"id"] isKindOfClass:NSString.class]?item[@"id"]:nil;
        if(target&&name.length&&identifier.length)[result addObject:@{@"id":identifier,@"name":name,@"target":target}];
    }
    return result;
}
static inline BOOL WLOCSaveFavorite(NSUserDefaults *store, NSString *name, NSDictionary *target) {
    name=[name stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    target=WLOCValidatedTarget(target);
    if(!name.length||name.length>60||!target)return NO;
    NSMutableArray *items=[WLOCReadFavorites(store) mutableCopy];
    if(items.count>=100)return NO;
    [items addObject:@{@"id":NSUUID.UUID.UUIDString,@"name":name,@"target":target}];
    [store setObject:items forKey:@"favoriteLocations"];return YES;
}
static inline void WLOCDeleteFavorite(NSUserDefaults *store, NSString *identifier) {
    NSMutableArray *items=[WLOCReadFavorites(store) mutableCopy];
    NSIndexSet *indexes=[items indexesOfObjectsPassingTest:^BOOL(NSDictionary *item,NSUInteger idx,BOOL *stop){return [item[@"id"] isEqual:identifier];}];
    [items removeObjectsAtIndexes:indexes];[store setObject:items forKey:@"favoriteLocations"];
}
